import { useEffect, useMemo, useRef, useState, type MouseEvent } from 'react';
import { AlertCircle, Calculator, CheckCircle2, Edit3, Plus, RefreshCw, Save, Search, Settings2, Table2, Trash2, WalletCards, X } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { PageHeader } from '../../../components/ui/PageHeader';
import { ConfirmModal } from '../../../components/ui/ConfirmModal';
import { useAuditPageAccess } from '../../../hooks/useAuditPageAccess';
import { useAuthStore } from '../../../stores/auth.store';
import { canManageBudgetItems, createBudgetItem, deleteBudgetItem, getBudgetDashboardSummary, listBudgetReportPeriods, saveBudgetAllocationTrancheDefinitions, saveBudgetItemAllocation, updateBudgetItem, updateBudgetItemAmounts, updateBudgetItemDetails } from '../services/budgetUtilization.service';
import { buildHierarchyRollupMap, formatBudgetAmount, getNetAllocationTotal, normalizeAmount, percent, summarizeBudgetItems, toNumber } from '../utils/budgetUtilizationCalculations';
import type { BudgetUtilizationAmount, BudgetUtilizationDashboardSummary, BudgetUtilizationItemInput, BudgetUtilizationItemWithAmount, BudgetUtilizationReportPeriod, BudgetUtilizationRowType, BudgetUtilizationTransactionType } from '../types/budgetUtilization.types';
import { getSafeUserErrorMessage } from '../../../utils/errorHandling';

type ItemForm = {
  itemId: string | null;
  parentId: string;
  rowType: BudgetUtilizationRowType;
  sequenceLabel: string;
  itemName: string;
  outputLabel: string;
  activitySequenceLabel: string;
  activityLabel: string;
  plannedBudgetAmount: string;
  netBudgetAfterTransferAmount: string;
  allocationTranche1Amount: string;
  allocationTranche1Date: string;
  allocationTranche2Amount: string;
  allocationTranche2Date: string;
  allocationTranche3Amount: string;
  allocationTranche3Date: string;
  centralTransferInAmount: string;
  centralTransferOutAmount: string;
  departmentRequestIncreaseAmount: string;
  departmentTransferOutAmount: string;
  divisionTransferInAmount: string;
  divisionTransferOutAmount: string;
  committedPoAmount: string;
  committedWithoutPoAmount: string;
  committedTotalAmount: string;
  disbursedGeneralAmount: string;
  disbursedAdvanceAmount: string;
  disbursedTotalAmount: string;
  utilizationTotalAmount: string;
  remainingAmount: string;
};

type AllocationTrancheKey = string;
type ItemsPageTab = 'transactions' | 'items';

type AllocationForm = {
  itemId: string;
  trancheKey: AllocationTrancheKey;
  amount: string;
  allocationDate: string;
  documentNumber: string;
};

type DisbursementForm = {
  itemId: string;
  disbursedGeneralAmount: string;
  disbursedGeneralDocumentNumber: string;
  disbursedAdvanceAmount: string;
  disbursedAdvanceDocumentNumber: string;
};

type CentralTransferForm = {
  itemId: string;
  centralTransferInAmount: string;
  centralTransferInDocumentNumber: string;
  centralTransferOutAmount: string;
  centralTransferOutDocumentNumber: string;
};

type DepartmentTransferForm = {
  itemId: string;
  departmentRequestIncreaseAmount: string;
  departmentRequestIncreaseDocumentNumber: string;
  departmentTransferOutAmount: string;
  departmentTransferOutDocumentNumber: string;
};

type DivisionTransferForm = {
  itemId: string;
  divisionTransferInAmount: string;
  divisionTransferInDocumentNumber: string;
  divisionTransferOutAmount: string;
  divisionTransferOutDocumentNumber: string;
};

type CommitmentForm = {
  itemId: string;
  committedPoAmount: string;
  committedPoDocumentNumber: string;
  committedWithoutPoAmount: string;
  committedWithoutPoDocumentNumber: string;
};

type EditableAmountField =
  | 'centralTransferInAmount'
  | 'centralTransferOutAmount'
  | 'departmentRequestIncreaseAmount'
  | 'departmentTransferOutAmount'
  | 'divisionTransferInAmount'
  | 'divisionTransferOutAmount'
  | 'committedPoAmount'
  | 'committedWithoutPoAmount'
  | 'disbursedGeneralAmount'
  | 'disbursedAdvanceAmount';

type CellEditTone = 'amber' | 'cyan' | 'blue' | 'orange' | 'purple' | 'emerald';

type CellEditState = {
  item: BudgetUtilizationItemWithAmount;
  label: string;
  value: string;
  field?: EditableAmountField;
  tranche?: TrancheDefinition;
  allocationDate: string;
  documentNumber: string;
  tone: CellEditTone;
};

type AmountReferenceDefinition = {
  referenceKey: string;
  transactionType: BudgetUtilizationTransactionType;
};

type AmountDisplaySign = '+' | '-';

type TrancheDefinition = {
  key: AllocationTrancheKey;
  id?: string;
  trancheNumber: number;
  label: string;
};

type TrancheForm = {
  key: AllocationTrancheKey | null;
  label: string;
};

type FormulaAuditRow = {
  key: string;
  title: string;
  formula: string;
  substitutedFormula: string;
  expected: number;
  displayed: number;
  suffix?: string;
  tone: 'lime' | 'purple' | 'emerald' | 'sky' | 'slate' | 'teal' | 'blue';
};

type HierarchyAuditIssue = {
  itemId: string;
  sequenceLabel: string;
  itemName: string;
  message: string;
};

const formulaAuditToneClasses: Record<FormulaAuditRow['tone'], string> = {
  lime: 'border-lime-300 bg-lime-50',
  purple: 'border-purple-300 bg-purple-50',
  emerald: 'border-emerald-300 bg-emerald-50',
  sky: 'border-sky-300 bg-sky-50',
  slate: 'border-slate-300 bg-slate-50',
  teal: 'border-teal-300 bg-teal-50',
  blue: 'border-blue-300 bg-blue-50',
};

function isFormulaValueEqual(left: number, right: number) {
  return Math.abs(left - right) < 0.01;
}

function settleCommitmentsFromDisbursement(
  form: ItemForm,
  previousDisbursedTotal: number,
  nextDisbursedTotal: number,
) {
  let settlementAmount = Math.max(0, nextDisbursedTotal - previousDisbursedTotal);
  let committedPo = toNumber(form.committedPoAmount);
  let committedWithoutPo = toNumber(form.committedWithoutPoAmount);

  const poSettlement = Math.min(committedPo, settlementAmount);
  committedPo -= poSettlement;
  settlementAmount -= poSettlement;

  const withoutPoSettlement = Math.min(committedWithoutPo, settlementAmount);
  committedWithoutPo -= withoutPoSettlement;

  const netBudget = toNumber(form.netBudgetAfterTransferAmount);
  if (netBudget > 0 && nextDisbursedTotal >= netBudget - 0.01) {
    committedPo = 0;
    committedWithoutPo = 0;
  }

  form.committedPoAmount = String(committedPo || '');
  form.committedWithoutPoAmount = String(committedWithoutPo || '');
  form.committedTotalAmount = String(committedPo + committedWithoutPo || '');
}

const emptyMainForm: ItemForm = {
  itemId: null,
  parentId: '',
  rowType: 'budget_category',
  sequenceLabel: '',
  itemName: '',
  outputLabel: '',
  activitySequenceLabel: '',
  activityLabel: '',
  plannedBudgetAmount: '',
  netBudgetAfterTransferAmount: '',
  allocationTranche1Amount: '',
  allocationTranche1Date: '',
  allocationTranche2Amount: '',
  allocationTranche2Date: '',
  allocationTranche3Amount: '',
  allocationTranche3Date: '',
  centralTransferInAmount: '',
  centralTransferOutAmount: '',
  departmentRequestIncreaseAmount: '',
  departmentTransferOutAmount: '',
  divisionTransferInAmount: '',
  divisionTransferOutAmount: '',
  committedPoAmount: '',
  committedWithoutPoAmount: '',
  committedTotalAmount: '',
  disbursedGeneralAmount: '',
  disbursedAdvanceAmount: '',
  disbursedTotalAmount: '',
  utilizationTotalAmount: '',
  remainingAmount: '',
};

const emptyChildForm: ItemForm = {
  ...emptyMainForm,
  rowType: 'line_item',
};

const emptyMajorProjectForm: ItemForm = {
  ...emptyMainForm,
  rowType: 'major_project',
};

const emptySubActivityForm: ItemForm = {
  ...emptyMainForm,
  rowType: 'sub_project',
};

const initialAllocationForm: AllocationForm = {
  itemId: '',
  trancheKey: 'legacy-1',
  amount: '',
  allocationDate: '',
  documentNumber: '',
};

const initialDisbursementForm: DisbursementForm = {
  itemId: '',
  disbursedGeneralAmount: '',
  disbursedGeneralDocumentNumber: '',
  disbursedAdvanceAmount: '',
  disbursedAdvanceDocumentNumber: '',
};

const initialCentralTransferForm: CentralTransferForm = {
  itemId: '',
  centralTransferInAmount: '',
  centralTransferInDocumentNumber: '',
  centralTransferOutAmount: '',
  centralTransferOutDocumentNumber: '',
};

const initialDepartmentTransferForm: DepartmentTransferForm = {
  itemId: '',
  departmentRequestIncreaseAmount: '',
  departmentRequestIncreaseDocumentNumber: '',
  departmentTransferOutAmount: '',
  departmentTransferOutDocumentNumber: '',
};

const initialDivisionTransferForm: DivisionTransferForm = {
  itemId: '',
  divisionTransferInAmount: '',
  divisionTransferInDocumentNumber: '',
  divisionTransferOutAmount: '',
  divisionTransferOutDocumentNumber: '',
};

const initialCommitmentForm: CommitmentForm = {
  itemId: '',
  committedPoAmount: '',
  committedPoDocumentNumber: '',
  committedWithoutPoAmount: '',
  committedWithoutPoDocumentNumber: '',
};

const initialTrancheDefinitions: TrancheDefinition[] = [
  { key: 'legacy-1', trancheNumber: 1, label: 'จัดสรรงวด 1' },
  { key: 'legacy-2', trancheNumber: 2, label: 'จัดสรรงวด 2' },
  { key: 'legacy-3', trancheNumber: 3, label: 'จัดสรรงวด 3' },
];

const emptyTrancheForm: TrancheForm = {
  key: null,
  label: '',
};

const cellEditToneClasses: Record<CellEditTone, {
  border: string;
  heading: string;
  input: string;
  note: string;
  button: string;
}> = {
  amber: {
    border: 'border-t-4 border-t-amber-500',
    heading: 'text-amber-800',
    input: 'focus:border-amber-500 focus:ring-amber-100',
    note: 'border-amber-200 bg-amber-50 text-amber-700',
    button: 'bg-amber-600 hover:bg-amber-700',
  },
  cyan: {
    border: 'border-t-4 border-t-cyan-600',
    heading: 'text-cyan-800',
    input: 'focus:border-cyan-500 focus:ring-cyan-100',
    note: 'border-cyan-200 bg-cyan-50 text-cyan-700',
    button: 'bg-cyan-700 hover:bg-cyan-800',
  },
  blue: {
    border: 'border-t-4 border-t-blue-600',
    heading: 'text-blue-800',
    input: 'focus:border-blue-500 focus:ring-blue-100',
    note: 'border-blue-200 bg-blue-50 text-blue-700',
    button: 'bg-blue-700 hover:bg-blue-800',
  },
  orange: {
    border: 'border-t-4 border-t-orange-500',
    heading: 'text-orange-800',
    input: 'focus:border-orange-500 focus:ring-orange-100',
    note: 'border-orange-200 bg-orange-50 text-orange-700',
    button: 'bg-orange-600 hover:bg-orange-700',
  },
  purple: {
    border: 'border-t-4 border-t-purple-600',
    heading: 'text-purple-800',
    input: 'focus:border-purple-500 focus:ring-purple-100',
    note: 'border-purple-200 bg-purple-50 text-purple-700',
    button: 'bg-purple-700 hover:bg-purple-800',
  },
  emerald: {
    border: 'border-t-4 border-t-emerald-600',
    heading: 'text-emerald-800',
    input: 'focus:border-emerald-500 focus:ring-emerald-100',
    note: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    button: 'bg-emerald-700 hover:bg-emerald-800',
  },
};

const detailAmountToneClasses: Record<CellEditTone, string> = {
  amber: 'border-amber-200 bg-amber-50 text-amber-950 hover:bg-amber-100',
  cyan: 'border-cyan-200 bg-cyan-50 text-cyan-950 hover:bg-cyan-100',
  blue: 'border-blue-200 bg-blue-50 text-blue-950 hover:bg-blue-100',
  orange: 'border-orange-200 bg-orange-50 text-orange-950 hover:bg-orange-100',
  purple: 'border-purple-200 bg-purple-50 text-purple-950 hover:bg-purple-100',
  emerald: 'border-emerald-200 bg-emerald-50 text-emerald-950 hover:bg-emerald-100',
};

function getAmountFieldTone(field: EditableAmountField): CellEditTone {
  if (field.startsWith('central')) return 'cyan';
  if (field.startsWith('department')) return 'blue';
  if (field.startsWith('division')) return 'orange';
  if (field.startsWith('committed')) return 'purple';
  return 'emerald';
}

const amountReferenceDefinitions: Record<EditableAmountField, AmountReferenceDefinition> = {
  centralTransferInAmount: { referenceKey: 'central_transfer_in', transactionType: 'central_transfer_in' },
  centralTransferOutAmount: { referenceKey: 'central_transfer_out', transactionType: 'central_transfer_out' },
  departmentRequestIncreaseAmount: { referenceKey: 'department_request_increase', transactionType: 'department_request_increase' },
  departmentTransferOutAmount: { referenceKey: 'department_transfer_out', transactionType: 'department_transfer_out' },
  divisionTransferInAmount: { referenceKey: 'division_transfer_in', transactionType: 'division_transfer_in' },
  divisionTransferOutAmount: { referenceKey: 'division_transfer_out', transactionType: 'division_transfer_out' },
  committedPoAmount: { referenceKey: 'committed_po', transactionType: 'committed_po' },
  committedWithoutPoAmount: { referenceKey: 'committed_without_po', transactionType: 'committed_without_po' },
  disbursedGeneralAmount: { referenceKey: 'disbursed_general', transactionType: 'disbursed_general' },
  disbursedAdvanceAmount: { referenceKey: 'disbursed_advance', transactionType: 'disbursed_advance' },
};

const amountFieldDisplaySigns: Partial<Record<EditableAmountField, AmountDisplaySign>> = {
  centralTransferInAmount: '+',
  centralTransferOutAmount: '-',
  departmentRequestIncreaseAmount: '+',
  departmentTransferOutAmount: '-',
  divisionTransferInAmount: '+',
  divisionTransferOutAmount: '-',
};

function formatSignedBudgetAmount(value: number, sign: AmountDisplaySign) {
  return `${sign}${formatBudgetAmount(Math.abs(value))}`;
}

function getBudgetItemSearchLabel(item: BudgetUtilizationItemWithAmount) {
  return `${item.sequence_label ? `${item.sequence_label} ` : ''}${item.item_name}`;
}

function SelectedDisbursementItemDetails({
  item,
  amount,
  fiscalYear,
  canEdit,
  onEditAmount,
}: {
  item: BudgetUtilizationItemWithAmount;
  amount: BudgetUtilizationAmount;
  fiscalYear: number | string;
  canEdit: boolean;
  onEditAmount: (field: EditableAmountField, label: string, value: number) => void;
}) {
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
        { label: 'รับโอน (2)', value: formatSignedBudgetAmount(amount.central_transfer_in_amount, '+'), field: 'centralTransferInAmount', editLabel: 'ส่วนกลางกรมฯ รับโอน', rawValue: item.amount.central_transfer_in_amount },
        { label: 'โอนออก (3)', value: formatSignedBudgetAmount(amount.central_transfer_out_amount, '-'), field: 'centralTransferOutAmount', editLabel: 'ส่วนกลางกรมฯ โอนออก', rawValue: item.amount.central_transfer_out_amount },
      ],
    },
    {
      title: 'ภายในกรม',
      headerClassName: 'bg-blue-700 text-white',
      bodyClassName: 'border-blue-200 bg-blue-50',
      metrics: [
        { label: 'ขอเพิ่ม', value: formatSignedBudgetAmount(amount.department_request_increase_amount, '+'), field: 'departmentRequestIncreaseAmount', editLabel: 'ภายในกรม ขอเพิ่ม', rawValue: item.amount.department_request_increase_amount },
        { label: 'โอนออก', value: formatSignedBudgetAmount(amount.department_transfer_out_amount, '-'), field: 'departmentTransferOutAmount', editLabel: 'ภายในกรม โอนออก', rawValue: item.amount.department_transfer_out_amount },
      ],
    },
    {
      title: 'ภายในกอง',
      headerClassName: 'bg-orange-600 text-white',
      bodyClassName: 'border-orange-200 bg-orange-50',
      metrics: [
        { label: 'รับโอน (2)', value: formatSignedBudgetAmount(amount.division_transfer_in_amount, '+'), field: 'divisionTransferInAmount', editLabel: 'ภายในกอง รับโอน', rawValue: item.amount.division_transfer_in_amount },
        { label: 'โอนออก (3)', value: formatSignedBudgetAmount(amount.division_transfer_out_amount, '-'), field: 'divisionTransferOutAmount', editLabel: 'ภายในกอง โอนออก', rawValue: item.amount.division_transfer_out_amount },
      ],
    },
    {
      title: 'ผูกพัน',
      headerClassName: 'bg-purple-700 text-white',
      bodyClassName: 'border-purple-200 bg-purple-50',
      metrics: [
        { label: 'มี PO (4)', value: formatBudgetAmount(amount.committed_po_amount), field: 'committedPoAmount', editLabel: 'ผูกพัน มี PO', rawValue: item.amount.committed_po_amount },
        { label: 'ไม่มี PO (5)', value: formatBudgetAmount(amount.committed_without_po_amount), field: 'committedWithoutPoAmount', editLabel: 'ผูกพัน ไม่มี PO', rawValue: item.amount.committed_without_po_amount },
        { label: 'รวม (6)', value: formatBudgetAmount(amount.committed_total_amount) },
      ],
    },
    {
      title: 'เบิก-จ่าย',
      headerClassName: 'bg-emerald-700 text-white',
      bodyClassName: 'border-emerald-200 bg-emerald-50',
      metrics: [
        { label: 'เบิกจ่ายทั่วไป (7)', value: formatBudgetAmount(amount.disbursed_general_amount), field: 'disbursedGeneralAmount', editLabel: 'เบิกจ่ายทั่วไป', rawValue: item.amount.disbursed_general_amount },
        { label: 'เงินยืมราชการ (8)', value: formatBudgetAmount(amount.disbursed_advance_amount), field: 'disbursedAdvanceAmount', editLabel: 'เงินยืมราชการ', rawValue: item.amount.disbursed_advance_amount },
        { label: 'รวม (9)', value: formatBudgetAmount(amount.disbursed_total_amount) },
      ],
    },
  ];

  const summaryMetrics = [
    { label: 'รวม (10) = (6) + (9)', value: formatBudgetAmount(amount.utilization_total_amount), className: 'border-yellow-200 bg-yellow-50' },
    { label: 'คงเหลือ (11) = (1) - (10)', value: formatBudgetAmount(amount.remaining_amount), className: 'border-slate-200 bg-slate-50' },
    { label: 'เบิกจ่ายตามจัดสรร ร้อยละ (12)', value: `${formatBudgetAmount(amount.disbursement_rate ?? 0)}%`, className: 'border-teal-200 bg-teal-50' },
    { label: 'เบิกจ่ายตามจัดสรร ร้อยละ (รวม PO)', value: `${formatBudgetAmount(amount.utilization_with_po_rate ?? 0)}%`, className: 'border-sky-200 bg-sky-50' },
  ];

  return (
    <section className="min-w-0 rounded-md border border-slate-200 bg-white p-3 shadow-sm" aria-live="polite">
      <div className="mb-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2.5">
        <p className="text-xs font-semibold text-slate-500">รายละเอียดรายการงบประมาณที่เลือก</p>
        <h3 className="mt-1 text-sm font-bold text-slate-950">
          {item.sequence_label ? `${item.sequence_label} ` : ''}{item.item_name}
        </h3>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-md border border-lime-200 bg-lime-50 px-3 py-2.5">
        <p className="text-xs font-semibold text-lime-950">ยอดสุทธิงบประมาณ {fiscalYear} หลังโอนเปลี่ยนแปลง (1)</p>
        <p className="text-base font-bold tabular-nums text-lime-950">{formatBudgetAmount(amount.net_budget_after_transfer_amount)}</p>
      </div>

      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
        {groups.map((group) => (
          <section key={group.title} className={`flex flex-col overflow-hidden rounded-md border ${group.bodyClassName}`}>
            <h4 className={`px-2 py-2 text-center text-xs font-bold ${group.headerClassName}`}>{group.title}</h4>
            <div className={`grid flex-1 divide-x divide-slate-200 ${group.metrics.length === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
              {group.metrics.map((metric) => {
                const isEditable = canEdit && metric.field && metric.editLabel && typeof metric.rawValue === 'number';
                const content = (
                  <>
                    {isEditable ? <Edit3 className="absolute right-1.5 top-1.5 h-3 w-3 text-slate-500" aria-hidden="true" /> : null}
                    <span className="text-[10px] font-semibold leading-4 text-slate-700">{metric.label}</span>
                    <strong className="break-all text-xs font-bold tabular-nums text-slate-950">{metric.value}</strong>
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
                  <div key={metric.label} className="relative flex min-w-0 flex-col justify-between gap-2 px-1.5 py-2.5 text-center">
                    {content}
                  </div>
                );
              })}
            </div>
          </section>
        ))}
        {summaryMetrics.map((metric) => (
          <div key={metric.label} className={`flex min-h-20 flex-col justify-between rounded-md border p-3 ${metric.className}`}>
            <p className="text-xs font-medium leading-5 text-slate-700">{metric.label}</p>
            <p className="mt-2 text-right text-sm font-bold tabular-nums text-slate-950">{metric.value}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function getDocumentNumber(item: BudgetUtilizationItemWithAmount, referenceKey: string) {
  return item.transactionReferences?.find((reference) => reference.reference_key === referenceKey)?.document_number ?? '';
}

function getItemTrancheValue(item: BudgetUtilizationItemWithAmount, tranche: TrancheDefinition) {
  const allocation = item.allocations?.find((entry) => entry.tranche_id === tranche.key) ?? null;
  const legacyAmount = tranche.trancheNumber === 1
    ? item.amount.allocation_tranche_1_amount
    : tranche.trancheNumber === 2
      ? item.amount.allocation_tranche_2_amount
      : tranche.trancheNumber === 3 ? item.amount.allocation_tranche_3_amount : 0;
  return allocation?.amount ?? legacyAmount;
}

function formFromItem(item: BudgetUtilizationItemWithAmount): ItemForm {
  return {
    itemId: item.id,
    parentId: item.parent_id ?? '',
    rowType: item.row_type,
    sequenceLabel: item.sequence_label ?? '',
    itemName: item.item_name,
    outputLabel: item.output_label ?? '',
    activitySequenceLabel: item.activity_sequence_label ?? '',
    activityLabel: item.activity_label ?? '',
    plannedBudgetAmount: String(item.amount.planned_budget_amount || ''),
    netBudgetAfterTransferAmount: String(item.amount.net_budget_after_transfer_amount || ''),
    allocationTranche1Amount: String(item.amount.allocation_tranche_1_amount || ''),
    allocationTranche1Date: item.amount.allocation_tranche_1_date ?? '',
    allocationTranche2Amount: String(item.amount.allocation_tranche_2_amount || ''),
    allocationTranche2Date: item.amount.allocation_tranche_2_date ?? '',
    allocationTranche3Amount: String(item.amount.allocation_tranche_3_amount || ''),
    allocationTranche3Date: item.amount.allocation_tranche_3_date ?? '',
    centralTransferInAmount: String(item.amount.central_transfer_in_amount || ''),
    centralTransferOutAmount: String(item.amount.central_transfer_out_amount || ''),
    departmentRequestIncreaseAmount: String(item.amount.department_request_increase_amount || ''),
    departmentTransferOutAmount: String(item.amount.department_transfer_out_amount || ''),
    divisionTransferInAmount: String(item.amount.division_transfer_in_amount || ''),
    divisionTransferOutAmount: String(item.amount.division_transfer_out_amount || ''),
    committedPoAmount: String(item.amount.committed_po_amount || ''),
    committedWithoutPoAmount: String(item.amount.committed_without_po_amount || ''),
    committedTotalAmount: String(item.amount.committed_total_amount || ''),
    disbursedGeneralAmount: String(item.amount.disbursed_general_amount || ''),
    disbursedAdvanceAmount: String(item.amount.disbursed_advance_amount || ''),
    disbursedTotalAmount: String(item.amount.disbursed_total_amount || ''),
    utilizationTotalAmount: String(item.amount.utilization_total_amount || ''),
    remainingAmount: String(item.amount.remaining_amount || ''),
  };
}

function toItemPayload(reportPeriodId: string, form: ItemForm, parentId: string | null, sequenceLabel: string): BudgetUtilizationItemInput {
  return {
    reportPeriodId,
    itemId: form.itemId ?? undefined,
    parentId,
    rowType: form.rowType,
    sequenceLabel,
    itemName: form.itemName,
    outputLabel: form.outputLabel,
    activitySequenceLabel: form.activitySequenceLabel,
    activityLabel: form.activityLabel,
    plannedBudgetAmount: toNumber(form.plannedBudgetAmount),
    netBudgetAfterTransferAmount: toNumber(form.netBudgetAfterTransferAmount),
    allocationTranche1Amount: toNumber(form.allocationTranche1Amount),
    allocationTranche1Date: form.allocationTranche1Date || null,
    allocationTranche2Amount: toNumber(form.allocationTranche2Amount),
    allocationTranche2Date: form.allocationTranche2Date || null,
    allocationTranche3Amount: toNumber(form.allocationTranche3Amount),
    allocationTranche3Date: form.allocationTranche3Date || null,
    centralTransferInAmount: toNumber(form.centralTransferInAmount),
    centralTransferOutAmount: toNumber(form.centralTransferOutAmount),
    departmentRequestIncreaseAmount: toNumber(form.departmentRequestIncreaseAmount),
    departmentTransferOutAmount: toNumber(form.departmentTransferOutAmount),
    divisionTransferInAmount: toNumber(form.divisionTransferInAmount),
    divisionTransferOutAmount: toNumber(form.divisionTransferOutAmount),
    committedPoAmount: toNumber(form.committedPoAmount),
    committedWithoutPoAmount: toNumber(form.committedWithoutPoAmount),
    committedTotalAmount: toNumber(form.committedTotalAmount),
    disbursedGeneralAmount: toNumber(form.disbursedGeneralAmount),
    disbursedAdvanceAmount: toNumber(form.disbursedAdvanceAmount),
    disbursedTotalAmount: toNumber(form.disbursedTotalAmount),
    utilizationTotalAmount: toNumber(form.utilizationTotalAmount),
    remainingAmount: toNumber(form.remainingAmount),
  };
}

export function BudgetUtilizationItemsPage() {
  useAuditPageAccess({ module: 'budget_utilization', action: 'budget_items_access', route: '/budget-utilization/items' });
  const [searchParams, setSearchParams] = useSearchParams();
  const role = useAuthStore((state) => state.profile?.role);
  const permissions = useAuthStore((state) => state.permissions);
  const canManage = canManageBudgetItems(role, permissions);
  const [reportPeriodId, setReportPeriodId] = useState('');
  const [reportPeriods, setReportPeriods] = useState<BudgetUtilizationReportPeriod[]>([]);
  const [summary, setSummary] = useState<BudgetUtilizationDashboardSummary | null>(null);
  const [keyword, setKeyword] = useState('');
  const [activeTab, setActiveTab] = useState<ItemsPageTab>('transactions');
  const [mainForm, setMainForm] = useState<ItemForm>(emptyMainForm);
  const [majorProjectForm, setMajorProjectForm] = useState<ItemForm>(emptyMajorProjectForm);
  const [subActivityForm, setSubActivityForm] = useState<ItemForm>(emptySubActivityForm);
  const [childForm, setChildForm] = useState<ItemForm>(emptyChildForm);
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [selectedMajorProjectId, setSelectedMajorProjectId] = useState('');
  const [selectedSubActivityId, setSelectedSubActivityId] = useState('');
  const [allocationForm, setAllocationForm] = useState<AllocationForm>(initialAllocationForm);
  const [disbursementForm, setDisbursementForm] = useState<DisbursementForm>(initialDisbursementForm);
  const [centralTransferForm, setCentralTransferForm] = useState<CentralTransferForm>(initialCentralTransferForm);
  const [departmentTransferForm, setDepartmentTransferForm] = useState<DepartmentTransferForm>(initialDepartmentTransferForm);
  const [divisionTransferForm, setDivisionTransferForm] = useState<DivisionTransferForm>(initialDivisionTransferForm);
  const [commitmentForm, setCommitmentForm] = useState<CommitmentForm>(initialCommitmentForm);
  const [allocationItemSearch, setAllocationItemSearch] = useState('');
  const [transactionItemSearch, setTransactionItemSearch] = useState('');
  const selectedDisbursementDetailsRef = useRef<HTMLDivElement | null>(null);
  const [trancheDefinitions, setTrancheDefinitions] = useState<TrancheDefinition[]>(initialTrancheDefinitions);
  const [trancheDrafts, setTrancheDrafts] = useState<TrancheDefinition[]>(initialTrancheDefinitions);
  const [trancheForm, setTrancheForm] = useState<TrancheForm>(emptyTrancheForm);
  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false);
  const [isTrancheManagerOpen, setIsTrancheManagerOpen] = useState(false);
  const [isAllocationEntryOpen, setIsAllocationEntryOpen] = useState(false);
  const [isBudgetDataEntryOpen, setIsBudgetDataEntryOpen] = useState(false);
  const [isFormulaAuditOpen, setIsFormulaAuditOpen] = useState(false);
  const [formulaAuditItemId, setFormulaAuditItemId] = useState('');
  const [editModalItem, setEditModalItem] = useState<BudgetUtilizationItemWithAmount | null>(null);
  const [editModalForm, setEditModalForm] = useState<ItemForm>(emptyMainForm);
  const [editModalError, setEditModalError] = useState<string | null>(null);
  const [cellEdit, setCellEdit] = useState<CellEditState | null>(null);
  const [cellEditError, setCellEditError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<BudgetUtilizationItemWithAmount | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async (nextReportPeriodId = reportPeriodId) => {
    try {
      setLoading(true);
      setError(null);
      const dashboardSummary = await getBudgetDashboardSummary(nextReportPeriodId || null);
      setSummary(dashboardSummary);
      setReportPeriodId(dashboardSummary.reportPeriod?.id ?? '');
      const loadedTranches = dashboardSummary.allocationTranches.map((tranche) => ({
        key: tranche.id,
        id: tranche.id,
        trancheNumber: tranche.tranche_number,
        label: tranche.label,
      }));
      if (loadedTranches.length > 0) {
        setTrancheDefinitions(loadedTranches);
        setTrancheDrafts(loadedTranches);
        setAllocationForm((current) => ({
          ...current,
          trancheKey: loadedTranches.some((tranche) => tranche.key === current.trancheKey)
            ? current.trancheKey
            : loadedTranches[0].key,
        }));
      }
      return dashboardSummary;
    } catch (loadError) {
      setError(getSafeUserErrorMessage(loadError, 'ไม่สามารถโหลดรายการงบประมาณได้'));
      return null;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const initialReportPeriodId = searchParams.get('period') ?? '';
    void Promise.all([
      listBudgetReportPeriods().then(setReportPeriods),
      loadData(initialReportPeriodId),
    ]);
  }, []);

  const ensureReportPeriodId = async () => {
    if (reportPeriodId) return reportPeriodId;
    throw new Error('กรุณาสร้างและเลือกปีงบประมาณก่อนกรอกข้อมูล');
  };

  const selectReportPeriod = (nextReportPeriodId: string) => {
    setSearchParams({ period: nextReportPeriodId }, { replace: true });
    setSelectedCategoryId('');
    setSelectedMajorProjectId('');
    setSelectedSubActivityId('');
    setMainForm(emptyMainForm);
    setMajorProjectForm(emptyMajorProjectForm);
    setSubActivityForm(emptySubActivityForm);
    setChildForm(emptyChildForm);
    setAllocationItemSearch('');
    setTransactionItemSearch('');
    setAllocationForm(initialAllocationForm);
    setDisbursementForm(initialDisbursementForm);
    setEditModalItem(null);
    setCellEdit(null);
    void loadData(nextReportPeriodId);
  };

  const allBudgetItems = useMemo(() => summary?.items ?? [], [summary]);
  const displayFiscalYear = summary?.reportPeriod?.fiscal_year ?? '-';
  const selectableReportPeriods = useMemo(() => reportPeriods.filter((period, index, periods) => (
    period.id === reportPeriodId
    || periods.findIndex((candidate) => candidate.fiscal_year === period.fiscal_year) === index
  )), [reportPeriodId, reportPeriods]);

  const hierarchyItems = useMemo(() => {
    const compareItems = (a: BudgetUtilizationItemWithAmount, b: BudgetUtilizationItemWithAmount) => {
      const sequenceCompare = (a.sequence_label ?? '').localeCompare(b.sequence_label ?? '', 'th', { numeric: true });
      if (sequenceCompare !== 0) return sequenceCompare;
      return a.sort_order - b.sort_order;
    };

    const childrenByParent = new Map<string, BudgetUtilizationItemWithAmount[]>();
    allBudgetItems.forEach((item) => {
      if (!item.parent_id) return;
      const children = childrenByParent.get(item.parent_id) ?? [];
      children.push(item);
      childrenByParent.set(item.parent_id, children);
    });

    const orderedItems: BudgetUtilizationItemWithAmount[] = [];
    const orderedIds = new Set<string>();
    const categories = allBudgetItems
      .filter((item) => item.parent_id === null && item.row_type === 'budget_category')
      .sort(compareItems);

    const appendItemAndDescendants = (item: BudgetUtilizationItemWithAmount) => {
      if (orderedIds.has(item.id)) return;
      orderedItems.push(item);
      orderedIds.add(item.id);
      (childrenByParent.get(item.id) ?? []).sort(compareItems).forEach(appendItemAndDescendants);
    };

    categories.forEach(appendItemAndDescendants);

    const orphanItems = allBudgetItems
      .filter((item) => item.row_type !== 'total' && !orderedIds.has(item.id))
      .sort(compareItems);

    return [...orderedItems, ...orphanItems];
  }, [allBudgetItems]);

  const rollupMap = useMemo(() => {
    return buildHierarchyRollupMap(allBudgetItems);
  }, [allBudgetItems]);

  const tableTotals = useMemo(() => {
    return summarizeBudgetItems(allBudgetItems);
  }, [allBudgetItems]);

  const formulaAuditItems = useMemo(() => {
    return hierarchyItems.filter((item) => item.row_type !== 'total');
  }, [hierarchyItems]);

  const formulaAuditItem = useMemo(() => {
    return formulaAuditItems.find((item) => item.id === formulaAuditItemId)
      ?? formulaAuditItems[0]
      ?? null;
  }, [formulaAuditItemId, formulaAuditItems]);

  const formulaAuditRows = useMemo<FormulaAuditRow[]>(() => {
    if (!formulaAuditItem) return [];

    const amount = rollupMap.get(formulaAuditItem.id) ?? normalizeAmount(formulaAuditItem.amount);
    const allocationTotal = toNumber(amount.allocation_total_amount) || (
      amount.allocation_tranche_1_amount
      + amount.allocation_tranche_2_amount
      + amount.allocation_tranche_3_amount
    );
    const expectedNet = allocationTotal
      + amount.central_transfer_in_amount
      - amount.central_transfer_out_amount
      + amount.department_request_increase_amount
      - amount.department_transfer_out_amount
      + amount.division_transfer_in_amount
      - amount.division_transfer_out_amount;
    const expectedCommitted = amount.committed_po_amount + amount.committed_without_po_amount;
    const expectedDisbursed = amount.disbursed_general_amount + amount.disbursed_advance_amount;
    const expectedUtilization = expectedCommitted + expectedDisbursed;
    const expectedRemaining = expectedNet - expectedUtilization;
    const expectedDisbursementRate = percent(expectedDisbursed, expectedNet);
    const expectedUtilizationRate = percent(expectedUtilization, expectedNet);
    const money = (value: number) => formatBudgetAmount(value);

    return [
      {
        key: 'net',
        title: `ยอดสุทธิหลังโอนเปลี่ยนแปลง (1)`,
        formula: 'ผลรวมงวดจัดสรร + รับ/ขอเพิ่ม - โอนออก',
        substitutedFormula: `${money(allocationTotal)} + ${money(amount.central_transfer_in_amount)} - ${money(amount.central_transfer_out_amount)} + ${money(amount.department_request_increase_amount)} - ${money(amount.department_transfer_out_amount)} + ${money(amount.division_transfer_in_amount)} - ${money(amount.division_transfer_out_amount)}`,
        expected: expectedNet,
        displayed: amount.net_budget_after_transfer_amount,
        tone: 'lime',
      },
      {
        key: 'committed',
        title: 'ผูกพันรวม (6)',
        formula: 'มี PO (4) + ไม่มี PO (5)',
        substitutedFormula: `${money(amount.committed_po_amount)} + ${money(amount.committed_without_po_amount)}`,
        expected: expectedCommitted,
        displayed: amount.committed_total_amount,
        tone: 'purple',
      },
      {
        key: 'disbursed',
        title: 'เบิกจ่ายรวม (9)',
        formula: 'เบิกจ่ายทั่วไป (7) + เงินยืมราชการ (8)',
        substitutedFormula: `${money(amount.disbursed_general_amount)} + ${money(amount.disbursed_advance_amount)}`,
        expected: expectedDisbursed,
        displayed: amount.disbursed_total_amount,
        tone: 'emerald',
      },
      {
        key: 'utilization',
        title: 'รวม (10)',
        formula: 'ผูกพันรวม (6) + เบิกจ่ายรวม (9)',
        substitutedFormula: `${money(expectedCommitted)} + ${money(expectedDisbursed)}`,
        expected: expectedUtilization,
        displayed: amount.utilization_total_amount,
        tone: 'sky',
      },
      {
        key: 'remaining',
        title: 'คงเหลือ (11)',
        formula: 'ยอดสุทธิ (1) - รวม (10)',
        substitutedFormula: `${money(expectedNet)} - ${money(expectedUtilization)}`,
        expected: expectedRemaining,
        displayed: amount.remaining_amount,
        tone: 'slate',
      },
      {
        key: 'disbursement-rate',
        title: 'ร้อยละเบิกจ่าย (12)',
        formula: 'เบิกจ่ายรวม (9) x 100 / ยอดสุทธิ (1)',
        substitutedFormula: `${money(expectedDisbursed)} x 100 / ${money(expectedNet)}`,
        expected: expectedDisbursementRate,
        displayed: amount.disbursement_rate ?? 0,
        suffix: '%',
        tone: 'teal',
      },
      {
        key: 'utilization-rate',
        title: 'ร้อยละรวม PO',
        formula: 'รวม (10) x 100 / ยอดสุทธิ (1)',
        substitutedFormula: `${money(expectedUtilization)} x 100 / ${money(expectedNet)}`,
        expected: expectedUtilizationRate,
        displayed: amount.utilization_with_po_rate ?? 0,
        suffix: '%',
        tone: 'blue',
      },
    ];
  }, [formulaAuditItem, rollupMap]);

  const hierarchyAuditIssues = useMemo<HierarchyAuditIssue[]>(() => {
    const itemById = new Map(allBudgetItems.map((item) => [item.id, item]));
    const childrenByParent = new Map<string, BudgetUtilizationItemWithAmount[]>();
    allBudgetItems.forEach((item) => {
      if (!item.parent_id) return;
      const children = childrenByParent.get(item.parent_id) ?? [];
      children.push(item);
      childrenByParent.set(item.parent_id, children);
    });

    const issues: HierarchyAuditIssue[] = [];
    allBudgetItems.filter((item) => item.row_type !== 'total').forEach((item) => {
      const parent = item.parent_id ? itemById.get(item.parent_id) : null;
      const addIssue = (message: string) => issues.push({
        itemId: item.id,
        sequenceLabel: item.sequence_label ?? '-',
        itemName: item.item_name,
        message,
      });

      if (item.parent_id && !parent) {
        addIssue('ไม่พบรายการแม่ที่เชื่อมโยง');
      } else if (item.row_type === 'major_project' && parent && parent.row_type !== 'budget_category') {
        addIssue('โครงการใหญ่ต้องอยู่ภายใต้ประเภทหลัก');
      } else if (item.row_type === 'sub_project' && parent && parent.row_type !== 'major_project') {
        addIssue('โครงการย่อยต้องอยู่ภายใต้โครงการใหญ่');
      } else if (item.row_type === 'activity' && parent && parent.row_type !== 'sub_project') {
        addIssue('กิจกรรมต้องอยู่ภายใต้โครงการย่อย');
      }

      const children = childrenByParent.get(item.id) ?? [];
      if (children.length === 0) return;
      const parentPlan = toNumber(item.amount.planned_budget_amount);
      const childPlan = children.reduce((sum, child) => sum + toNumber(child.amount.planned_budget_amount), 0);
      if (parentPlan > 0 && childPlan - parentPlan > 0.01) {
        addIssue(`วงเงินรายการลูก ${formatBudgetAmount(childPlan)} บาท เกินวงเงินรายการแม่ ${formatBudgetAmount(parentPlan)} บาท`);
      }
    });

    return issues;
  }, [allBudgetItems]);

  const openFormulaAudit = () => {
    setFormulaAuditItemId((current) => current || formulaAuditItems[0]?.id || '');
    setIsFormulaAuditOpen(true);
  };

  const filteredItems = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();
    if (!normalizedKeyword) return hierarchyItems;

    const matchesKeyword = (item: BudgetUtilizationItemWithAmount) => `${item.sequence_label ?? ''} ${item.item_name} ${item.output_label ?? ''} ${item.activity_sequence_label ?? ''} ${item.activity_label ?? ''}`.toLowerCase().includes(normalizedKeyword);
    const itemById = new Map(allBudgetItems.map((item) => [item.id, item]));
    const visibleIds = new Set(allBudgetItems.filter(matchesKeyword).map((item) => item.id));
    allBudgetItems.filter(matchesKeyword).forEach((item) => {
      let parentId = item.parent_id;
      while (parentId) {
        visibleIds.add(parentId);
        parentId = itemById.get(parentId)?.parent_id ?? null;
      }
    });

    return hierarchyItems.filter((item) => visibleIds.has(item.id));
  }, [allBudgetItems, hierarchyItems, keyword]);

  const mainBudgetItems = useMemo(() => {
    return allBudgetItems.filter((item) => item.parent_id === null && item.row_type === 'budget_category');
  }, [allBudgetItems]);

  const selectedParent = useMemo(() => {
    return allBudgetItems.find((item) => item.id === childForm.parentId) ?? null;
  }, [allBudgetItems, childForm.parentId]);

  const majorProjectItems = useMemo(() => {
    return allBudgetItems.filter((item) => item.row_type === 'major_project');
  }, [allBudgetItems]);

  const selectedMainCategory = useMemo(() => {
    let currentItem = selectedParent;
    while (currentItem && currentItem.row_type !== 'budget_category') {
      currentItem = currentItem.parent_id
        ? allBudgetItems.find((item) => item.id === currentItem?.parent_id) ?? null
        : null;
    }
    return currentItem ?? mainBudgetItems.find((item) => item.id === selectedCategoryId) ?? null;
  }, [allBudgetItems, mainBudgetItems, selectedCategoryId, selectedParent]);

  const selectedCategoryMajorProjects = useMemo(() => {
    if (!selectedMainCategory) return [];
    return majorProjectItems
      .filter((project) => project.parent_id === selectedMainCategory.id)
      .sort((a, b) => {
        const sequenceCompare = (a.sequence_label ?? '').localeCompare(b.sequence_label ?? '', 'th', { numeric: true });
        return sequenceCompare || a.sort_order - b.sort_order;
      });
  }, [majorProjectItems, selectedMainCategory]);

  const selectedMajorProject = useMemo(() => {
    return selectedCategoryMajorProjects.find((project) => project.id === selectedMajorProjectId) ?? null;
  }, [selectedCategoryMajorProjects, selectedMajorProjectId]);

  const selectedMajorProjectSubActivities = useMemo(() => {
    if (!selectedMajorProject) return [];
    return allBudgetItems
      .filter((item) => item.parent_id === selectedMajorProject.id && item.row_type === 'sub_project')
      .sort((a, b) => {
        const sequenceCompare = (a.sequence_label ?? '').localeCompare(b.sequence_label ?? '', 'th', { numeric: true });
        return sequenceCompare || a.sort_order - b.sort_order;
      });
  }, [allBudgetItems, selectedMajorProject]);

  const selectedSubActivity = useMemo(() => {
    return selectedMajorProjectSubActivities.find((item) => item.id === selectedSubActivityId) ?? null;
  }, [selectedMajorProjectSubActivities, selectedSubActivityId]);

  const selectedSubActivityBudgetItems = useMemo(() => {
    if (!selectedSubActivity) return [];
    return allBudgetItems
      .filter((item) => item.parent_id === selectedSubActivity.id && item.row_type === 'activity')
      .sort((a, b) => {
        const aSequence = a.activity_sequence_label ?? a.sequence_label ?? '';
        const bSequence = b.activity_sequence_label ?? b.sequence_label ?? '';
        const sequenceCompare = aSequence.localeCompare(bSequence, 'th', { numeric: true });
        return sequenceCompare || a.sort_order - b.sort_order;
      });
  }, [allBudgetItems, selectedSubActivity]);

  const isOperationsCategorySelected = selectedMainCategory?.item_name.replace(/\s+/g, '').includes('งบดำเนินงาน') ?? false;

  const availableBudgetParents = useMemo(() => {
    return mainBudgetItems.flatMap((category) => [
      category,
      ...majorProjectItems
        .filter((project) => project.parent_id === category.id)
        .flatMap((project) => [
          project,
          ...allBudgetItems.filter((item) => item.parent_id === project.id && item.row_type === 'sub_project'),
        ]),
    ]);
  }, [allBudgetItems, mainBudgetItems, majorProjectItems]);

  const selectedParentChildTotal = useMemo(() => {
    if (!selectedParent || !summary) return 0;

    return summary.items
      .filter((item) => item.parent_id === selectedParent.id && item.id !== childForm.itemId)
      .reduce((sum, item) => sum + item.amount.planned_budget_amount, 0);
  }, [childForm.itemId, selectedParent, summary]);

  const budgetLineItems = useMemo(() => {
    return hierarchyItems.filter((item) => {
      if (item.parent_id === null) return false;
      const isStructuralMajorProject = item.row_type === 'major_project'
        && allBudgetItems.some((candidate) => candidate.parent_id === item.id);
      const isStructuralSubActivity = item.row_type === 'sub_project'
        && allBudgetItems.some((candidate) => candidate.parent_id === item.id);
      return !isStructuralMajorProject && !isStructuralSubActivity;
    });
  }, [allBudgetItems, hierarchyItems]);

  const transactionItemSearchResults = useMemo(() => {
    const normalizedQuery = transactionItemSearch.trim().toLocaleLowerCase('th-TH');
    const terms = normalizedQuery.split(/\s+/).filter(Boolean);

    return budgetLineItems
      .map((item) => {
        const label = getBudgetItemSearchLabel(item);
        const normalizedLabel = label.toLocaleLowerCase('th-TH');
        const normalizedSequence = (item.sequence_label ?? '').toLocaleLowerCase('th-TH');
        const normalizedName = item.item_name.toLocaleLowerCase('th-TH');
        const matches = terms.length === 0 || terms.every((term) => normalizedLabel.includes(term));
        const score = normalizedQuery.length === 0
          ? 4
          : normalizedSequence.startsWith(normalizedQuery)
            ? 0
            : normalizedName.startsWith(normalizedQuery)
              ? 1
              : normalizedLabel.includes(normalizedQuery) ? 2 : 3;
        return { item, label, matches, score };
      })
      .filter((entry) => entry.matches)
      .sort((a, b) => a.score - b.score || a.label.localeCompare(b.label, 'th', { numeric: true }));
  }, [budgetLineItems, transactionItemSearch]);

  const allocationItemSearchResults = useMemo(() => {
    const normalizedQuery = allocationItemSearch.trim().toLocaleLowerCase('th-TH');
    const terms = normalizedQuery.split(/\s+/).filter(Boolean);

    return budgetLineItems
      .map((item) => {
        const label = getBudgetItemSearchLabel(item);
        const normalizedLabel = label.toLocaleLowerCase('th-TH');
        const normalizedSequence = (item.sequence_label ?? '').toLocaleLowerCase('th-TH');
        const normalizedName = item.item_name.toLocaleLowerCase('th-TH');
        const matches = terms.length === 0 || terms.every((term) => normalizedLabel.includes(term));
        const score = normalizedQuery.length === 0
          ? 4
          : normalizedSequence.startsWith(normalizedQuery)
            ? 0
            : normalizedName.startsWith(normalizedQuery)
              ? 1
              : normalizedLabel.includes(normalizedQuery) ? 2 : 3;
        return { item, label, matches, score };
      })
      .filter((entry) => entry.matches)
      .sort((a, b) => a.score - b.score || a.label.localeCompare(b.label, 'th', { numeric: true }));
  }, [allocationItemSearch, budgetLineItems]);

  const selectedAllocationItem = useMemo(() => {
    return budgetLineItems.find((item) => item.id === allocationForm.itemId) ?? null;
  }, [allocationForm.itemId, budgetLineItems]);

  const selectedDisbursementItem = useMemo(() => {
    return budgetLineItems.find((item) => item.id === disbursementForm.itemId) ?? null;
  }, [budgetLineItems, disbursementForm.itemId]);

  const selectedDisbursementAmount = useMemo(() => {
    if (!selectedDisbursementItem) return null;
    return rollupMap.get(selectedDisbursementItem.id) ?? normalizeAmount(selectedDisbursementItem.amount);
  }, [rollupMap, selectedDisbursementItem]);

  const selectTransactionBudgetItem = (item: BudgetUtilizationItemWithAmount) => {
    setTransactionItemSearch(getBudgetItemSearchLabel(item));
    setDisbursementForm((current) => ({ ...current, itemId: item.id }));
    applySelectedDisbursementItemValue(item);
  };

  const selectAllocationBudgetItem = (item: BudgetUtilizationItemWithAmount) => {
    setAllocationItemSearch(getBudgetItemSearchLabel(item));
    setAllocationForm((current) => ({ ...current, itemId: item.id }));
    applySelectedAllocationItemValue(item, allocationForm.trancheKey);
  };

  const selectSubActivityBudgetItem = (item: BudgetUtilizationItemWithAmount) => {
    setActiveTab('transactions');
    selectAllocationBudgetItem(item);
    selectTransactionBudgetItem(item);
  };

  useEffect(() => {
    if (!disbursementForm.itemId) return;

    const frameId = window.requestAnimationFrame(() => {
      selectedDisbursementDetailsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [disbursementForm.itemId]);

  const selectedCentralTransferItem = useMemo(() => {
    return budgetLineItems.find((item) => item.id === centralTransferForm.itemId) ?? null;
  }, [budgetLineItems, centralTransferForm.itemId]);

  const selectedDepartmentTransferItem = useMemo(() => {
    return budgetLineItems.find((item) => item.id === departmentTransferForm.itemId) ?? null;
  }, [budgetLineItems, departmentTransferForm.itemId]);

  const selectedDivisionTransferItem = useMemo(() => {
    return budgetLineItems.find((item) => item.id === divisionTransferForm.itemId) ?? null;
  }, [budgetLineItems, divisionTransferForm.itemId]);

  const selectedCommitmentItem = useMemo(() => {
    return budgetLineItems.find((item) => item.id === commitmentForm.itemId) ?? null;
  }, [budgetLineItems, commitmentForm.itemId]);

  const getMainSequenceLabel = (itemId: string | null) => {
    const existingIndex = itemId ? mainBudgetItems.findIndex((item) => item.id === itemId) : -1;
    return String(existingIndex >= 0 ? existingIndex + 1 : mainBudgetItems.length + 1);
  };

  const getChildSequenceLabel = (parent: BudgetUtilizationItemWithAmount, itemId: string | null) => {
    const siblings = (summary?.items ?? []).filter((item) => item.parent_id === parent.id);
    const existingIndex = itemId ? siblings.findIndex((item) => item.id === itemId) : -1;
    const childIndex = existingIndex >= 0 ? existingIndex + 1 : siblings.length + 1;
    const parentSequence = parent.sequence_label || getMainSequenceLabel(parent.id);
    return `${parentSequence}.${childIndex}`;
  };

  const getCategoryChildCount = (categoryId: string) => {
    return (summary?.items ?? []).filter((item) => item.parent_id === categoryId).length;
  };

  const getDirectChildCount = (itemId: string) => {
    return (summary?.items ?? []).filter((item) => item.parent_id === itemId).length;
  };

  const getDescendantItems = (itemId: string) => {
    const descendants: BudgetUtilizationItemWithAmount[] = [];
    const appendChildren = (parentId: string) => {
      (summary?.items ?? []).filter((item) => item.parent_id === parentId).forEach((item) => {
        descendants.push(item);
        appendChildren(item.id);
      });
    };
    appendChildren(itemId);
    return descendants;
  };

  const getTrancheUsageCount = (trancheKey: AllocationTrancheKey) => {
    return budgetLineItems.filter((item) => item.allocations?.some((allocation) => (
      allocation.tranche_id === trancheKey && (allocation.amount !== 0 || Boolean(allocation.allocation_date))
    ))).length;
  };

  const saveTrancheDraft = () => {
    const label = trancheForm.label.trim();
    if (!label) {
      setError('กรุณากรอกชื่องวดจัดสรร');
      return;
    }

    setError(null);
    if (trancheForm.key) {
      setTrancheDrafts((current) => current.map((tranche) => (
        tranche.key === trancheForm.key ? { ...tranche, label } : tranche
      )));
      setTrancheForm(emptyTrancheForm);
      return;
    }

    const nextTrancheNumber = Math.max(0, ...trancheDrafts.map((tranche) => tranche.trancheNumber)) + 1;
    setTrancheDrafts((current) => [...current, {
      key: `new-${crypto.randomUUID()}`,
      trancheNumber: nextTrancheNumber,
      label,
    }]);
    setTrancheForm(emptyTrancheForm);
  };

  const deleteTrancheDraft = (trancheKey: AllocationTrancheKey) => {
    if (trancheDrafts.length <= 1) {
      setError('ต้องมีงวดจัดสรรอย่างน้อย 1 งวด');
      return;
    }

    if (getTrancheUsageCount(trancheKey) > 0) {
      setError('ลบงวดจัดสรรไม่ได้ เนื่องจากมีรายการงบประมาณใช้งานงวดนี้อยู่');
      return;
    }

    setError(null);
    setTrancheDrafts((current) => current.filter((tranche) => tranche.key !== trancheKey));
    if (trancheForm.key === trancheKey) {
      setTrancheForm(emptyTrancheForm);
    }
  };

  const saveTrancheDefinitions = async () => {
    if (!reportPeriodId) return;
    const nextDefinitions = trancheDrafts.map((tranche) => ({
      ...tranche,
      label: tranche.label.trim() || `จัดสรรงวด ${tranche.trancheNumber}`,
    }));
    try {
      setSaving(true);
      setError(null);
      const savedDefinitions = await saveBudgetAllocationTrancheDefinitions(
        reportPeriodId,
        nextDefinitions.map((tranche, index) => ({
          id: tranche.id,
          trancheNumber: tranche.trancheNumber,
          label: tranche.label,
          sortOrder: index + 1,
        })),
      );
      const mappedDefinitions = savedDefinitions.map((tranche) => ({
        key: tranche.id,
        id: tranche.id,
        trancheNumber: tranche.tranche_number,
        label: tranche.label,
      }));
      setTrancheDefinitions(mappedDefinitions);
      setTrancheDrafts(mappedDefinitions);
      const nextKey = mappedDefinitions.some((tranche) => tranche.key === allocationForm.trancheKey)
        ? allocationForm.trancheKey
        : mappedDefinitions[0]?.key ?? '';
      setAllocationForm((current) => ({ ...current, trancheKey: nextKey }));
      applySelectedAllocationItemValue(selectedAllocationItem, nextKey);
      setTrancheForm(emptyTrancheForm);
      setIsTrancheManagerOpen(false);
      await loadData(reportPeriodId);
    } catch (saveError) {
      setError(getSafeUserErrorMessage(saveError, 'ไม่สามารถบันทึกการจัดการงวดได้'));
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (item: BudgetUtilizationItemWithAmount) => {
    setEditModalItem(item);
    setEditModalForm(formFromItem(item));
    setEditModalError(null);
  };

  const closeEditModal = () => {
    if (saving) return;
    setEditModalItem(null);
    setEditModalForm(emptyMainForm);
    setEditModalError(null);
  };

  const saveEditModal = async () => {
    if (!editModalItem || !editModalForm.itemName.trim()) {
      setEditModalError('กรุณาระบุชื่อรายการงบประมาณ');
      return;
    }

    try {
      setSaving(true);
      setEditModalError(null);
      const editedItemId = editModalItem.id;
      const activeReportPeriodId = await ensureReportPeriodId();
      await updateBudgetItemDetails(toItemPayload(
        activeReportPeriodId,
        editModalForm,
        editModalItem.parent_id,
        editModalForm.sequenceLabel || editModalItem.sequence_label || '',
      ));
      setEditModalItem(null);
      setEditModalForm(emptyMainForm);
      const refreshedSummary = await loadData(activeReportPeriodId);
      const refreshedItem = refreshedSummary?.items.find((item) => item.id === editedItemId) ?? null;
      if (refreshedItem && allocationForm.itemId === editedItemId) {
        setAllocationItemSearch(getBudgetItemSearchLabel(refreshedItem));
        applySelectedAllocationItemValue(refreshedItem, allocationForm.trancheKey);
      }
      if (refreshedItem && disbursementForm.itemId === editedItemId) {
        setTransactionItemSearch(getBudgetItemSearchLabel(refreshedItem));
        applySelectedDisbursementItemValue(refreshedItem);
      }
    } catch (saveError) {
      setEditModalError(getSafeUserErrorMessage(saveError, 'ไม่สามารถบันทึกการแก้ไขรายการได้'));
    } finally {
      setSaving(false);
    }
  };

  const openAmountCellEdit = (
    event: MouseEvent<HTMLButtonElement> | null,
    item: BudgetUtilizationItemWithAmount,
    field: EditableAmountField,
    label: string,
    value: number,
  ) => {
    event?.stopPropagation();
    const referenceDefinition = amountReferenceDefinitions[field];
    setCellEdit({
      item,
      field,
      label,
      value: String(value || ''),
      allocationDate: '',
      documentNumber: getDocumentNumber(item, referenceDefinition.referenceKey),
      tone: getAmountFieldTone(field),
    });
    setCellEditError(null);
  };

  const openAllocationCellEdit = (
    event: MouseEvent<HTMLButtonElement> | null,
    item: BudgetUtilizationItemWithAmount,
    tranche: TrancheDefinition,
  ) => {
    event?.stopPropagation();
    const allocation = item.allocations?.find((entry) => entry.tranche_id === tranche.key) ?? null;
    const legacyAmount = tranche.trancheNumber === 1
      ? item.amount.allocation_tranche_1_amount
      : tranche.trancheNumber === 2
        ? item.amount.allocation_tranche_2_amount
        : tranche.trancheNumber === 3 ? item.amount.allocation_tranche_3_amount : 0;
    const legacyDate = tranche.trancheNumber === 1
      ? item.amount.allocation_tranche_1_date
      : tranche.trancheNumber === 2
        ? item.amount.allocation_tranche_2_date
        : tranche.trancheNumber === 3 ? item.amount.allocation_tranche_3_date : null;

    setCellEdit({
      item,
      tranche,
      label: tranche.label,
      value: String(allocation?.amount || legacyAmount || ''),
      allocationDate: allocation?.allocation_date ?? legacyDate ?? '',
      documentNumber: getDocumentNumber(item, `allocation:${tranche.key}`),
      tone: 'amber',
    });
    setCellEditError(null);
  };

  const closeCellEdit = () => {
    if (saving) return;
    setCellEdit(null);
    setCellEditError(null);
  };

  const saveCellEdit = async () => {
    if (!cellEdit) return;

    try {
      setSaving(true);
      setCellEditError(null);
      const activeReportPeriodId = await ensureReportPeriodId();

      if (cellEdit.tranche) {
        const selectedTranche = summary?.allocationTranches.find((tranche) => tranche.id === cellEdit.tranche?.key);
        if (!selectedTranche) throw new Error('ไม่พบงวดจัดสรรที่เลือก');
        await saveBudgetItemAllocation(
          cellEdit.item.id,
          selectedTranche,
          toNumber(cellEdit.value),
          cellEdit.allocationDate || null,
          cellEdit.documentNumber,
        );
      } else if (cellEdit.field) {
        const nextForm = formFromItem(cellEdit.item);
        nextForm[cellEdit.field] = cellEdit.value;
        if (cellEdit.field === 'disbursedGeneralAmount' || cellEdit.field === 'disbursedAdvanceAmount') {
          const previousDisbursedTotal = cellEdit.item.amount.disbursed_general_amount
            + cellEdit.item.amount.disbursed_advance_amount;
          const nextDisbursedTotal = toNumber(nextForm.disbursedGeneralAmount)
            + toNumber(nextForm.disbursedAdvanceAmount);
          settleCommitmentsFromDisbursement(nextForm, previousDisbursedTotal, nextDisbursedTotal);
        }
        if (cellEdit.field === 'committedPoAmount' || cellEdit.field === 'committedWithoutPoAmount') {
          const committedTotal = toNumber(nextForm.committedPoAmount) + toNumber(nextForm.committedWithoutPoAmount);
          const availableForCommitment = Math.max(
            0,
            toNumber(nextForm.netBudgetAfterTransferAmount)
              - toNumber(nextForm.disbursedGeneralAmount)
              - toNumber(nextForm.disbursedAdvanceAmount),
          );
          if (committedTotal - availableForCommitment > 0.01) {
            throw new Error(`ยอดผูกพันคงค้างต้องไม่เกินวงเงินที่ยังไม่เบิกจ่าย ${formatBudgetAmount(availableForCommitment)} บาท`);
          }
        }
        const referenceDefinition = amountReferenceDefinitions[cellEdit.field];
        await updateBudgetItemAmounts(
          toItemPayload(
            activeReportPeriodId,
            nextForm,
            cellEdit.item.parent_id,
            cellEdit.item.sequence_label ?? '',
          ),
          [{
            ...referenceDefinition,
            documentNumber: cellEdit.documentNumber,
            amount: toNumber(cellEdit.value),
          }],
        );
      }

      setCellEdit(null);
      const refreshedSummary = await loadData(activeReportPeriodId);
      if (refreshedSummary) {
        const refreshedItem = refreshedSummary.items.find((item) => item.id === cellEdit.item.id) ?? null;
        if (refreshedItem) {
          if (editModalItem?.id === refreshedItem.id) setEditModalItem(refreshedItem);
          if (allocationForm.itemId === refreshedItem.id) applySelectedAllocationItemValue(refreshedItem, allocationForm.trancheKey);
          if (centralTransferForm.itemId === refreshedItem.id) applySelectedCentralTransferItemValue(refreshedItem);
          if (departmentTransferForm.itemId === refreshedItem.id) applySelectedDepartmentTransferItemValue(refreshedItem);
          if (divisionTransferForm.itemId === refreshedItem.id) applySelectedDivisionTransferItemValue(refreshedItem);
          if (commitmentForm.itemId === refreshedItem.id) applySelectedCommitmentItemValue(refreshedItem);
          if (disbursementForm.itemId === refreshedItem.id) applySelectedDisbursementItemValue(refreshedItem);
        }
      }
    } catch (saveError) {
      setCellEditError(getSafeUserErrorMessage(saveError, 'ไม่สามารถบันทึกตัวเลขรายการได้'));
    } finally {
      setSaving(false);
    }
  };

  const applySelectedAllocationItemValue = (item: BudgetUtilizationItemWithAmount | null, trancheKey: AllocationTrancheKey) => {
    if (!item) {
      setAllocationForm((current) => ({ ...current, amount: '', allocationDate: '', documentNumber: '' }));
      return;
    }

    const allocation = item.allocations?.find((entry) => entry.tranche_id === trancheKey) ?? null;
    const definition = trancheDefinitions.find((tranche) => tranche.key === trancheKey) ?? null;
    const legacyAmount = definition?.trancheNumber === 1
      ? item.amount.allocation_tranche_1_amount
      : definition?.trancheNumber === 2
        ? item.amount.allocation_tranche_2_amount
        : definition?.trancheNumber === 3 ? item.amount.allocation_tranche_3_amount : 0;
    const legacyDate = definition?.trancheNumber === 1
      ? item.amount.allocation_tranche_1_date
      : definition?.trancheNumber === 2
        ? item.amount.allocation_tranche_2_date
        : definition?.trancheNumber === 3 ? item.amount.allocation_tranche_3_date : null;

    setAllocationForm((current) => ({
      ...current,
      amount: String(allocation?.amount || legacyAmount || ''),
      allocationDate: allocation?.allocation_date ?? legacyDate ?? '',
      documentNumber: getDocumentNumber(item, `allocation:${trancheKey}`),
    }));
  };

  const applySelectedDisbursementItemValue = (item: BudgetUtilizationItemWithAmount | null) => {
    setDisbursementForm((current) => ({
      ...current,
      disbursedGeneralAmount: item ? String(item.amount.disbursed_general_amount || '') : '',
      disbursedGeneralDocumentNumber: item ? getDocumentNumber(item, 'disbursed_general') : '',
      disbursedAdvanceAmount: item ? String(item.amount.disbursed_advance_amount || '') : '',
      disbursedAdvanceDocumentNumber: item ? getDocumentNumber(item, 'disbursed_advance') : '',
    }));
  };

  const applySelectedCentralTransferItemValue = (item: BudgetUtilizationItemWithAmount | null) => {
    setCentralTransferForm((current) => ({
      ...current,
      centralTransferInAmount: item ? String(item.amount.central_transfer_in_amount || '') : '',
      centralTransferInDocumentNumber: item ? getDocumentNumber(item, 'central_transfer_in') : '',
      centralTransferOutAmount: item ? String(item.amount.central_transfer_out_amount || '') : '',
      centralTransferOutDocumentNumber: item ? getDocumentNumber(item, 'central_transfer_out') : '',
    }));
  };

  const applySelectedDepartmentTransferItemValue = (item: BudgetUtilizationItemWithAmount | null) => {
    setDepartmentTransferForm((current) => ({
      ...current,
      departmentRequestIncreaseAmount: item ? String(item.amount.department_request_increase_amount || '') : '',
      departmentRequestIncreaseDocumentNumber: item ? getDocumentNumber(item, 'department_request_increase') : '',
      departmentTransferOutAmount: item ? String(item.amount.department_transfer_out_amount || '') : '',
      departmentTransferOutDocumentNumber: item ? getDocumentNumber(item, 'department_transfer_out') : '',
    }));
  };

  const applySelectedDivisionTransferItemValue = (item: BudgetUtilizationItemWithAmount | null) => {
    setDivisionTransferForm((current) => ({
      ...current,
      divisionTransferInAmount: item ? String(item.amount.division_transfer_in_amount || '') : '',
      divisionTransferInDocumentNumber: item ? getDocumentNumber(item, 'division_transfer_in') : '',
      divisionTransferOutAmount: item ? String(item.amount.division_transfer_out_amount || '') : '',
      divisionTransferOutDocumentNumber: item ? getDocumentNumber(item, 'division_transfer_out') : '',
    }));
  };

  const applySelectedCommitmentItemValue = (item: BudgetUtilizationItemWithAmount | null) => {
    setCommitmentForm((current) => ({
      ...current,
      committedPoAmount: item ? String(item.amount.committed_po_amount || '') : '',
      committedPoDocumentNumber: item ? getDocumentNumber(item, 'committed_po') : '',
      committedWithoutPoAmount: item ? String(item.amount.committed_without_po_amount || '') : '',
      committedWithoutPoDocumentNumber: item ? getDocumentNumber(item, 'committed_without_po') : '',
    }));
  };

  const saveAllocationForm = async () => {
    if (!selectedAllocationItem) {
      setError('กรุณาเลือกรายการงบประมาณก่อนบันทึกจัดสรรงวด');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      const activeReportPeriodId = await ensureReportPeriodId();
      const selectedTranche = summary?.allocationTranches.find((tranche) => tranche.id === allocationForm.trancheKey);
      if (!selectedTranche) {
        throw new Error('ไม่พบงวดจัดสรรที่เลือก');
      }
      await saveBudgetItemAllocation(
        selectedAllocationItem.id,
        selectedTranche,
        toNumber(allocationForm.amount),
        allocationForm.allocationDate || null,
        allocationForm.documentNumber,
      );
      const refreshedSummary = await loadData(activeReportPeriodId);
      const refreshedItem = refreshedSummary?.items.find((item) => item.id === selectedAllocationItem.id) ?? null;
      if (refreshedItem) {
        applySelectedAllocationItemValue(refreshedItem, allocationForm.trancheKey);
      }
    } catch (saveError) {
      setError(getSafeUserErrorMessage(saveError, 'ไม่สามารถบันทึกจัดสรรงวดได้'));
    } finally {
      setSaving(false);
    }
  };

  const saveDisbursementForm = async () => {
    if (!selectedDisbursementItem) {
      setError('กรุณาเลือกรายการงบประมาณก่อนบันทึกเบิก-จ่าย');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      const activeReportPeriodId = await ensureReportPeriodId();
      const nextForm = formFromItem(selectedDisbursementItem);
      const disbursedGeneral = toNumber(disbursementForm.disbursedGeneralAmount);
      const disbursedAdvance = toNumber(disbursementForm.disbursedAdvanceAmount);
      const disbursedTotal = disbursedGeneral + disbursedAdvance;
      const previousDisbursedTotal = selectedDisbursementItem.amount.disbursed_general_amount
        + selectedDisbursementItem.amount.disbursed_advance_amount;
      settleCommitmentsFromDisbursement(nextForm, previousDisbursedTotal, disbursedTotal);
      const committedTotal = toNumber(nextForm.committedTotalAmount);
      const utilizationTotal = committedTotal + disbursedTotal;
      const effectiveBudget = toNumber(nextForm.netBudgetAfterTransferAmount);
      const remainingAmount = effectiveBudget - utilizationTotal;

      nextForm.disbursedGeneralAmount = disbursementForm.disbursedGeneralAmount;
      nextForm.disbursedAdvanceAmount = disbursementForm.disbursedAdvanceAmount;
      nextForm.disbursedTotalAmount = String(disbursedTotal || '');
      nextForm.utilizationTotalAmount = String(utilizationTotal || '');
      nextForm.remainingAmount = String(remainingAmount || '');

      await updateBudgetItemAmounts(
        toItemPayload(activeReportPeriodId, nextForm, selectedDisbursementItem.parent_id, selectedDisbursementItem.sequence_label ?? ''),
        [
          { referenceKey: 'disbursed_general', transactionType: 'disbursed_general', documentNumber: disbursementForm.disbursedGeneralDocumentNumber, amount: disbursedGeneral },
          { referenceKey: 'disbursed_advance', transactionType: 'disbursed_advance', documentNumber: disbursementForm.disbursedAdvanceDocumentNumber, amount: disbursedAdvance },
        ],
      );
      await loadData(activeReportPeriodId);
    } catch (saveError) {
      setError(getSafeUserErrorMessage(saveError, 'ไม่สามารถบันทึกเบิก-จ่ายได้'));
    } finally {
      setSaving(false);
    }
  };

  const saveCentralTransferForm = async () => {
    if (!selectedCentralTransferItem) {
      setError('กรุณาเลือกรายการงบประมาณก่อนบันทึกส่วนกลางกรมฯ');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      const activeReportPeriodId = await ensureReportPeriodId();
      const nextForm = formFromItem(selectedCentralTransferItem);
      const centralTransferIn = toNumber(centralTransferForm.centralTransferInAmount);
      const centralTransferOut = toNumber(centralTransferForm.centralTransferOutAmount);
      const effectiveBudget =
        toNumber(nextForm.netBudgetAfterTransferAmount) -
        toNumber(nextForm.centralTransferInAmount) +
        toNumber(nextForm.centralTransferOutAmount) +
        centralTransferIn -
        centralTransferOut;
      const utilizationTotal = toNumber(nextForm.committedTotalAmount) + toNumber(nextForm.disbursedTotalAmount);
      const remainingAmount = effectiveBudget - utilizationTotal;

      nextForm.centralTransferInAmount = centralTransferForm.centralTransferInAmount;
      nextForm.centralTransferOutAmount = centralTransferForm.centralTransferOutAmount;
      nextForm.netBudgetAfterTransferAmount = String(effectiveBudget || '');
      nextForm.utilizationTotalAmount = String(utilizationTotal || '');
      nextForm.remainingAmount = String(remainingAmount || '');

      await updateBudgetItemAmounts(
        toItemPayload(activeReportPeriodId, nextForm, selectedCentralTransferItem.parent_id, selectedCentralTransferItem.sequence_label ?? ''),
        [
          { referenceKey: 'central_transfer_in', transactionType: 'central_transfer_in', documentNumber: centralTransferForm.centralTransferInDocumentNumber, amount: centralTransferIn },
          { referenceKey: 'central_transfer_out', transactionType: 'central_transfer_out', documentNumber: centralTransferForm.centralTransferOutDocumentNumber, amount: centralTransferOut },
        ],
      );
      await loadData(activeReportPeriodId);
    } catch (saveError) {
      setError(getSafeUserErrorMessage(saveError, 'ไม่สามารถบันทึกส่วนกลางกรมฯ ได้'));
    } finally {
      setSaving(false);
    }
  };

  const saveDivisionTransferForm = async () => {
    if (!selectedDivisionTransferItem) {
      setError('กรุณาเลือกรายการงบประมาณก่อนบันทึกภายในกอง');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      const activeReportPeriodId = await ensureReportPeriodId();
      const nextForm = formFromItem(selectedDivisionTransferItem);
      const divisionTransferIn = toNumber(divisionTransferForm.divisionTransferInAmount);
      const divisionTransferOut = toNumber(divisionTransferForm.divisionTransferOutAmount);
      const effectiveBudget =
        toNumber(nextForm.netBudgetAfterTransferAmount) -
        toNumber(nextForm.divisionTransferInAmount) +
        toNumber(nextForm.divisionTransferOutAmount) +
        divisionTransferIn -
        divisionTransferOut;
      const remainingAmount = effectiveBudget - toNumber(nextForm.utilizationTotalAmount);

      nextForm.divisionTransferInAmount = divisionTransferForm.divisionTransferInAmount;
      nextForm.divisionTransferOutAmount = divisionTransferForm.divisionTransferOutAmount;
      nextForm.netBudgetAfterTransferAmount = String(effectiveBudget || '');
      nextForm.remainingAmount = String(remainingAmount || '');

      await updateBudgetItemAmounts(
        toItemPayload(activeReportPeriodId, nextForm, selectedDivisionTransferItem.parent_id, selectedDivisionTransferItem.sequence_label ?? ''),
        [
          { referenceKey: 'division_transfer_in', transactionType: 'division_transfer_in', documentNumber: divisionTransferForm.divisionTransferInDocumentNumber, amount: divisionTransferIn },
          { referenceKey: 'division_transfer_out', transactionType: 'division_transfer_out', documentNumber: divisionTransferForm.divisionTransferOutDocumentNumber, amount: divisionTransferOut },
        ],
      );
      await loadData(activeReportPeriodId);
    } catch (saveError) {
      setError(getSafeUserErrorMessage(saveError, 'ไม่สามารถบันทึกภายในกองได้'));
    } finally {
      setSaving(false);
    }
  };

  const saveDepartmentTransferForm = async () => {
    if (!selectedDepartmentTransferItem) {
      setError('กรุณาเลือกรายการงบประมาณก่อนบันทึกภายในกรม');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      const activeReportPeriodId = await ensureReportPeriodId();
      const nextForm = formFromItem(selectedDepartmentTransferItem);
      const requestIncrease = toNumber(departmentTransferForm.departmentRequestIncreaseAmount);
      const transferOut = toNumber(departmentTransferForm.departmentTransferOutAmount);
      const effectiveBudget =
        toNumber(nextForm.netBudgetAfterTransferAmount) -
        toNumber(nextForm.departmentRequestIncreaseAmount) +
        toNumber(nextForm.departmentTransferOutAmount) +
        requestIncrease -
        transferOut;
      const remainingAmount = effectiveBudget - toNumber(nextForm.utilizationTotalAmount);

      nextForm.departmentRequestIncreaseAmount = departmentTransferForm.departmentRequestIncreaseAmount;
      nextForm.departmentTransferOutAmount = departmentTransferForm.departmentTransferOutAmount;
      nextForm.netBudgetAfterTransferAmount = String(effectiveBudget || '');
      nextForm.remainingAmount = String(remainingAmount || '');

      await updateBudgetItemAmounts(
        toItemPayload(activeReportPeriodId, nextForm, selectedDepartmentTransferItem.parent_id, selectedDepartmentTransferItem.sequence_label ?? ''),
        [
          { referenceKey: 'department_request_increase', transactionType: 'department_request_increase', documentNumber: departmentTransferForm.departmentRequestIncreaseDocumentNumber, amount: requestIncrease },
          { referenceKey: 'department_transfer_out', transactionType: 'department_transfer_out', documentNumber: departmentTransferForm.departmentTransferOutDocumentNumber, amount: transferOut },
        ],
      );
      await loadData(activeReportPeriodId);
    } catch (saveError) {
      setError(getSafeUserErrorMessage(saveError, 'ไม่สามารถบันทึกภายในกรมได้'));
    } finally {
      setSaving(false);
    }
  };

  const saveCommitmentForm = async () => {
    if (!selectedCommitmentItem) {
      setError('กรุณาเลือกรายการงบประมาณก่อนบันทึกผูกพัน');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      const activeReportPeriodId = await ensureReportPeriodId();
      const nextForm = formFromItem(selectedCommitmentItem);
      const committedPo = toNumber(commitmentForm.committedPoAmount);
      const committedWithoutPo = toNumber(commitmentForm.committedWithoutPoAmount);
      const committedTotal = committedPo + committedWithoutPo;
      const disbursedTotal = toNumber(nextForm.disbursedTotalAmount);
      const utilizationTotal = committedTotal + disbursedTotal;
      const effectiveBudget = toNumber(nextForm.netBudgetAfterTransferAmount);
      const availableForCommitment = Math.max(0, effectiveBudget - disbursedTotal);
      if (committedTotal - availableForCommitment > 0.01) {
        throw new Error(`ยอดผูกพันคงค้างต้องไม่เกินวงเงินที่ยังไม่เบิกจ่าย ${formatBudgetAmount(availableForCommitment)} บาท`);
      }
      const remainingAmount = effectiveBudget - utilizationTotal;

      nextForm.committedPoAmount = commitmentForm.committedPoAmount;
      nextForm.committedWithoutPoAmount = commitmentForm.committedWithoutPoAmount;
      nextForm.committedTotalAmount = String(committedTotal || '');
      nextForm.utilizationTotalAmount = String(utilizationTotal || '');
      nextForm.remainingAmount = String(remainingAmount || '');

      await updateBudgetItemAmounts(
        toItemPayload(activeReportPeriodId, nextForm, selectedCommitmentItem.parent_id, selectedCommitmentItem.sequence_label ?? ''),
        [
          { referenceKey: 'committed_po', transactionType: 'committed_po', documentNumber: commitmentForm.committedPoDocumentNumber, amount: committedPo },
          { referenceKey: 'committed_without_po', transactionType: 'committed_without_po', documentNumber: commitmentForm.committedWithoutPoDocumentNumber, amount: committedWithoutPo },
        ],
      );
      await loadData(activeReportPeriodId);
    } catch (saveError) {
      setError(getSafeUserErrorMessage(saveError, 'ไม่สามารถบันทึกผูกพันได้'));
    } finally {
      setSaving(false);
    }
  };

  const saveMainForm = async () => {
    try {
      setSaving(true);
      setError(null);
      const activeReportPeriodId = await ensureReportPeriodId();
      const payload = toItemPayload(
        activeReportPeriodId,
        { ...mainForm, plannedBudgetAmount: '', outputLabel: '', activityLabel: '' },
        null,
        getMainSequenceLabel(mainForm.itemId),
      );

      if (mainForm.itemId) {
        await updateBudgetItem(payload);
      } else {
        await createBudgetItem(payload);
      }

      setMainForm(emptyMainForm);
      await loadData(activeReportPeriodId);
    } catch (saveError) {
      setError(getSafeUserErrorMessage(saveError, 'ไม่สามารถบันทึกประเภทหลักได้'));
    } finally {
      setSaving(false);
    }
  };

  const saveMajorProjectForm = async () => {
    const categoryId = majorProjectForm.parentId || selectedMainCategory?.id || '';
    if (!categoryId) {
      setError('กรุณาเลือกประเภทหลักงบดำเนินงานก่อนสร้างโครงการใหญ่');
      return;
    }

    const category = mainBudgetItems.find((item) => item.id === categoryId);
    if (!category || !category.item_name.replace(/\s+/g, '').includes('งบดำเนินงาน')) {
      setError('โครงการใหญ่ต้องอยู่ภายใต้ประเภทหลักงบดำเนินงาน');
      return;
    }

    const majorProjectBudget = toNumber(majorProjectForm.plannedBudgetAmount);
    if (majorProjectBudget <= 0) {
      setError('กรุณาระบุวงเงินโครงการใหญ่ให้มากกว่า 0');
      return;
    }

    const existingSubProjectTotal = majorProjectForm.itemId
      ? allBudgetItems
          .filter((item) => item.parent_id === majorProjectForm.itemId && item.row_type === 'sub_project')
          .reduce((sum, item) => sum + item.amount.planned_budget_amount, 0)
      : 0;
    if (majorProjectBudget < existingSubProjectTotal) {
      setError(`วงเงินโครงการใหญ่ต้องไม่น้อยกว่ายอดรวมกิจกรรมย่อย ${formatBudgetAmount(existingSubProjectTotal)} บาท`);
      return;
    }

    try {
      setSaving(true);
      setError(null);
      const activeReportPeriodId = await ensureReportPeriodId();
      const payload = toItemPayload(
        activeReportPeriodId,
        { ...majorProjectForm, rowType: 'major_project' },
        category.id,
        getChildSequenceLabel(category, majorProjectForm.itemId),
      );

      let savedProject: { id: string };
      if (majorProjectForm.itemId) {
        savedProject = await updateBudgetItem(payload);
      } else {
        savedProject = await createBudgetItem(payload);
      }

      setMajorProjectForm({ ...emptyMajorProjectForm, parentId: category.id });
      setSelectedMajorProjectId(savedProject.id);
      setSelectedSubActivityId('');
      setSubActivityForm({ ...emptySubActivityForm, parentId: savedProject.id });
      setChildForm(emptyChildForm);
      await loadData(activeReportPeriodId);
    } catch (saveError) {
      setError(getSafeUserErrorMessage(saveError, 'ไม่สามารถบันทึกโครงการใหญ่ได้'));
    } finally {
      setSaving(false);
    }
  };

  const saveSubActivityForm = async () => {
    if (!selectedMajorProject) {
      setError('กรุณาเลือกโครงการใหญ่ก่อนสร้างกิจกรรมย่อย');
      return;
    }

    if (!subActivityForm.itemName.trim()) {
      setError('กรุณาระบุชื่อกิจกรรมย่อย');
      return;
    }

    const subActivityBudget = toNumber(subActivityForm.plannedBudgetAmount);
    if (subActivityBudget < 0) {
      setError('วงเงินโครงการย่อยต้องไม่ติดลบ');
      return;
    }

    const otherSubActivityTotal = selectedMajorProjectSubActivities
      .filter((item) => item.id !== subActivityForm.itemId)
      .reduce((sum, item) => sum + item.amount.planned_budget_amount, 0);
    if (otherSubActivityTotal + subActivityBudget > selectedMajorProject.amount.planned_budget_amount) {
      setError(`วงเงินรวมของกิจกรรมย่อยต้องไม่เกินวงเงินโครงการใหญ่ ${formatBudgetAmount(selectedMajorProject.amount.planned_budget_amount)} บาท`);
      return;
    }

    const existingActivityTotal = subActivityForm.itemId
      ? getDescendantItems(subActivityForm.itemId)
          .filter((item) => item.row_type === 'activity' || item.row_type === 'line_item')
          .reduce((sum, item) => sum + item.amount.planned_budget_amount, 0)
      : 0;
    if (subActivityBudget < existingActivityTotal) {
      setError(`วงเงินกิจกรรมย่อยต้องไม่น้อยกว่ายอดรวมกิจกรรม ${formatBudgetAmount(existingActivityTotal)} บาท`);
      return;
    }

    try {
      setSaving(true);
      setError(null);
      const activeReportPeriodId = await ensureReportPeriodId();
      const payload = toItemPayload(
        activeReportPeriodId,
        { ...subActivityForm, parentId: selectedMajorProject.id, rowType: 'sub_project' },
        selectedMajorProject.id,
        getChildSequenceLabel(selectedMajorProject, subActivityForm.itemId),
      );
      const savedSubActivity = subActivityForm.itemId
        ? await updateBudgetItem(payload)
        : await createBudgetItem(payload);

      setSubActivityForm({ ...emptySubActivityForm, parentId: selectedMajorProject.id });
      setSelectedSubActivityId(savedSubActivity.id);
      setChildForm({ ...emptyChildForm, parentId: savedSubActivity.id, rowType: 'activity' });
      await loadData(activeReportPeriodId);
    } catch (saveError) {
      setError(getSafeUserErrorMessage(saveError, 'ไม่สามารถบันทึกกิจกรรมย่อยได้'));
    } finally {
      setSaving(false);
    }
  };

  const saveChildForm = async () => {
    if (!childForm.parentId) {
      setError('กรุณาเลือกประเภทหลักก่อนสร้างรายการงบประมาณ');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      const activeReportPeriodId = await ensureReportPeriodId();
      const parentItem = availableBudgetParents.find((item) => item.id === childForm.parentId);
      if (!parentItem) {
        setError('ไม่พบประเภทหลักหรือโครงการใหญ่ที่เลือก');
        return;
      }

      if (parentItem.row_type === 'sub_project') {
        const majorProject = allBudgetItems.find((item) => item.id === parentItem.parent_id) ?? null;
        const siblingTotal = getDescendantItems(parentItem.id)
          .filter((item) => (item.row_type === 'activity' || item.row_type === 'line_item') && item.id !== childForm.itemId)
          .reduce((sum, item) => sum + item.amount.planned_budget_amount, 0);
        const nextActivityTotal = siblingTotal + toNumber(childForm.plannedBudgetAmount);
        if (nextActivityTotal > parentItem.amount.planned_budget_amount) {
          setError(`วงเงินรวมของกิจกรรมต้องไม่เกินวงเงินกิจกรรมย่อย ${formatBudgetAmount(parentItem.amount.planned_budget_amount)} บาท`);
          return;
        }
        if (!majorProject) {
          setError('ไม่พบโครงการใหญ่ของกิจกรรมย่อยที่เลือก');
          return;
        }
      } else if (parentItem.row_type === 'major_project') {
        const siblingTotal = getDescendantItems(parentItem.id)
          .filter((item) => (item.row_type === 'activity' || item.row_type === 'line_item') && item.id !== childForm.itemId)
          .reduce((sum, item) => sum + item.amount.planned_budget_amount, 0);
        const nextSubProjectTotal = siblingTotal + toNumber(childForm.plannedBudgetAmount);
        if (nextSubProjectTotal > parentItem.amount.planned_budget_amount) {
          setError(`วงเงินรวมของโครงการย่อยต้องไม่เกินวงเงินโครงการใหญ่ ${formatBudgetAmount(parentItem.amount.planned_budget_amount)} บาท`);
          return;
        }
      }

      const rowType: BudgetUtilizationRowType = parentItem.row_type === 'sub_project'
        ? 'activity'
        : parentItem.row_type === 'major_project' ? 'sub_project' : 'line_item';
      const payload = toItemPayload(
        activeReportPeriodId,
        { ...childForm, rowType },
        childForm.parentId,
        getChildSequenceLabel(parentItem, childForm.itemId),
      );

      if (childForm.itemId) {
        await updateBudgetItem(payload);
      } else {
        await createBudgetItem(payload);
      }

      setChildForm({ ...emptyChildForm, parentId: selectedSubActivity?.id ?? selectedCategoryId, rowType: selectedSubActivity ? 'activity' : 'line_item' });
      await loadData(activeReportPeriodId);
    } catch (saveError) {
      setError(getSafeUserErrorMessage(saveError, 'ไม่สามารถบันทึกรายการงบประมาณได้'));
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    if (getDirectChildCount(deleteTarget.id) > 0) {
      setError('ลบหัวข้อนี้ไม่ได้ เนื่องจากยังมีรายการอยู่ภายใต้หัวข้อนี้');
      setDeleteTarget(null);
      return;
    }

    try {
      setSaving(true);
      setError(null);
      const deletedItemId = deleteTarget.id;
      await deleteBudgetItem(deletedItemId);
      setDeleteTarget(null);
      if (allocationForm.itemId === deletedItemId) {
        setAllocationItemSearch('');
        setAllocationForm((current) => ({ ...initialAllocationForm, trancheKey: current.trancheKey }));
      }
      if (disbursementForm.itemId === deletedItemId) {
        setTransactionItemSearch('');
        setDisbursementForm(initialDisbursementForm);
        applySelectedDisbursementItemValue(null);
      }
      await loadData(reportPeriodId);
    } catch (deleteError) {
      setError(getSafeUserErrorMessage(deleteError, 'ไม่สามารถลบรายการงบประมาณได้'));
    } finally {
      setSaving(false);
    }
  };

  const editModalHasChildren = editModalItem ? getDirectChildCount(editModalItem.id) > 0 : false;
  const editModalAmount = editModalItem
    ? (rollupMap.get(editModalItem.id) ?? normalizeAmount(editModalItem.amount))
    : null;
  const editModalParent = editModalItem?.parent_id
    ? allBudgetItems.find((item) => item.id === editModalItem.parent_id) ?? null
    : null;
  const cellEditHasRecordedData = cellEdit
    ? Math.abs(toNumber(cellEdit.value)) > 0.005
      || Boolean(cellEdit.allocationDate)
      || Boolean(cellEdit.documentNumber)
    : false;

  const renderDetailAmount = (
    label: string,
    value: number,
    tone: CellEditTone,
    onEdit?: () => void,
    note?: string,
    documentNumber?: string,
    displaySign?: AmountDisplaySign,
  ) => {
    const isEditable = canManage && !editModalHasChildren && Boolean(onEdit);
    const hasRecordedData = Math.abs(value) > 0.005 || Boolean(note) || Boolean(documentNumber);
    const content = (
      <>
        <span className="block text-xs font-medium opacity-75">{label}</span>
        <span className="mt-1 block text-right text-base font-semibold">
          {displaySign ? formatSignedBudgetAmount(value, displaySign) : formatBudgetAmount(value)} บาท
        </span>
        {note ? <span className="mt-1 block text-xs opacity-70">{note}</span> : null}
        <span className="mt-1 block text-xs opacity-70">เลขที่หนังสือ: {documentNumber || 'ยังไม่ได้ระบุ'}</span>
      </>
    );

    return isEditable ? (
      <button
        type="button"
        onClick={onEdit}
        className={`flex min-h-[132px] w-full flex-col rounded-md border p-3 text-left transition focus:outline-none focus:ring-2 focus:ring-sky-300 ${detailAmountToneClasses[tone]}`}
        title={`${hasRecordedData ? 'แก้ไข' : 'เพิ่ม'}${label}`}
      >
        {content}
        <span className="mt-auto inline-flex items-center gap-1 pt-3 text-xs font-medium">
          {hasRecordedData ? <Edit3 className="h-3.5 w-3.5" aria-hidden="true" /> : <Plus className="h-3.5 w-3.5" aria-hidden="true" />}
          {hasRecordedData ? 'แก้ไขข้อมูล' : 'เพิ่มข้อมูล'}
        </span>
      </button>
    ) : (
      <div className={`min-h-[132px] w-full rounded-md border p-3 ${detailAmountToneClasses[tone].replace(/ hover:[^ ]+/g, '')}`}>
        {content}
        {editModalHasChildren ? <span className="mt-2 block text-xs font-medium opacity-70">ยอดรวมจากรายการภายใต้โครงการ</span> : null}
      </div>
    );
  };

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <PageHeader title="รายการงบประมาณ" description={summary?.reportPeriod ? `กำลังกรอกข้อมูลปีงบประมาณ ${summary.reportPeriod.fiscal_year}` : 'กรุณาเลือกปีงบประมาณ'} />
        <div className="flex flex-wrap items-end gap-2">
          <label className="block">
            <span className="text-xs font-semibold text-slate-600">ปีงบประมาณที่ต้องการกรอก</span>
            <select
              value={reportPeriodId}
              onChange={(event) => selectReportPeriod(event.target.value)}
              disabled={loading || selectableReportPeriods.length === 0}
              className="mt-1 h-10 min-w-56 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-900 shadow-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 disabled:opacity-60"
            >
              {selectableReportPeriods.length === 0 ? <option value="">ยังไม่มีปีงบประมาณ</option> : null}
              {selectableReportPeriods.map((period) => (
                <option key={period.id} value={period.id}>
                  ปีงบประมาณ {period.fiscal_year}{period.is_active ? ' (ใช้งานอยู่)' : ''}{reportPeriods.filter((candidate) => candidate.fiscal_year === period.fiscal_year).length > 1 ? ` — ${period.title}` : ''}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={() => void loadData(reportPeriodId)}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            โหลดใหม่
          </button>
        </div>
      </div>

      {error ? (
        <div className="mb-5 flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          {error}
        </div>
      ) : null}

      {canManage ? (
        <div className="mb-5">
          <section className="rounded-md border border-sky-100 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-slate-950">{childForm.itemId ? 'แก้ไขรายการงบประมาณ' : 'เพิ่มรายการงบประมาณ'}</h2>
                <p className="mt-1 text-xs text-slate-500">เลือกว่าอยู่ใต้ประเภทหลักใด แล้วกรอกข้อมูลวงเงินและผลการใช้จ่าย</p>
              </div>
              {childForm.itemId ? (
                <button
                  type="button"
                  onClick={() => setChildForm({
                    ...emptyChildForm,
                    parentId: selectedSubActivity?.id ?? selectedMainCategory?.id ?? selectedCategoryId,
                    rowType: selectedSubActivity ? 'activity' : 'line_item',
                  })}
                  className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                  ยกเลิก
                </button>
              ) : null}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <span className="text-xs font-semibold text-slate-600">ประเภทหลักหรือโครงการใหญ่</span>
                <div className="mt-1 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                  <select
                    value={selectedMainCategory?.id ?? selectedCategoryId}
                    onChange={(event) => {
                      const categoryId = event.target.value;
                      const category = mainBudgetItems.find((item) => item.id === categoryId) ?? null;
                      setSelectedCategoryId(categoryId);
                      setSelectedMajorProjectId('');
                      setSelectedSubActivityId('');
                      setSubActivityForm(emptySubActivityForm);
                      setChildForm((current) => ({ ...current, parentId: categoryId, rowType: 'line_item' }));
                      if (category?.item_name.replace(/\s+/g, '').includes('งบดำเนินงาน')) {
                        setMajorProjectForm((current) => ({ ...current, parentId: category.id }));
                      } else {
                        setMajorProjectForm(emptyMajorProjectForm);
                      }
                    }}
                    className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                  >
                    <option value="">เลือกประเภทหลักก่อน</option>
                    {mainBudgetItems.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.sequence_label ? `${item.sequence_label} ` : ''}
                        {item.item_name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      setMainForm(emptyMainForm);
                      setIsCategoryManagerOpen(true);
                    }}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    <Settings2 className="h-4 w-4" aria-hidden="true" />
                    จัดการประเภทหลัก
                  </button>
                </div>
              </div>
              {selectedParent ? (
                <div className="rounded-md border border-sky-100 bg-sky-50/70 px-3 py-2 text-xs text-sky-900 sm:col-span-2">
                  <div className="font-semibold">
                    {selectedParent.row_type === 'major_project' ? 'โครงการใหญ่' : selectedParent.row_type === 'sub_project' ? 'กิจกรรมย่อย' : 'ประเภทหลัก'}: {selectedParent.item_name}
                  </div>
                  <div className="mt-1 grid gap-1 sm:grid-cols-2">
                    <span>
                      {selectedParent.row_type === 'major_project'
                        ? 'วงเงินโครงการใหญ่'
                        : selectedParent.row_type === 'sub_project' ? 'วงเงินกิจกรรมย่อย' : 'รวมวงเงินรายการภายใต้หัวข้อนี้'}:{' '}
                      {formatBudgetAmount(
                        selectedParent.row_type === 'major_project' || selectedParent.row_type === 'sub_project'
                          ? selectedParent.amount.planned_budget_amount
                          : selectedParentChildTotal,
                      )} บาท
                    </span>
                    <span>จำนวนรายการ: {(summary?.items ?? []).filter((item) => item.parent_id === selectedParent.id).length}</span>
                  </div>
                </div>
              ) : null}
              {isOperationsCategorySelected ? (
                <div className="rounded-md border border-teal-200 bg-teal-50/40 p-3 sm:col-span-2">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-950">
                        {majorProjectForm.itemId ? 'แก้ไขโครงการใหญ่' : 'สร้างโครงการใหญ่ภายใต้งบดำเนินงาน'}
                      </h3>
                      <p className="mt-0.5 text-xs text-slate-500">กำหนดชื่อ วงเงิน เลขกิจกรรม และชื่อกิจกรรม ก่อนสร้างกิจกรรมย่อย</p>
                    </div>
                    {majorProjectForm.itemId ? (
                      <button
                        type="button"
                        onClick={() => setMajorProjectForm({ ...emptyMajorProjectForm, parentId: selectedMainCategory?.id ?? '' })}
                        className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2.5 text-xs font-semibold text-slate-600"
                      >
                        <X className="h-3.5 w-3.5" aria-hidden="true" />
                        ยกเลิก
                      </button>
                    ) : null}
                  </div>
                  <div className="grid gap-3 lg:grid-cols-[minmax(0,1.2fr)_minmax(8rem,0.4fr)_minmax(0,1fr)_minmax(10rem,0.55fr)_auto] lg:items-end">
                    <label className="block">
                      <span className="text-xs font-semibold text-slate-600">ชื่อโครงการใหญ่</span>
                      <input
                        value={majorProjectForm.itemName}
                        onChange={(event) => setMajorProjectForm((current) => ({ ...current, parentId: selectedMainCategory?.id ?? current.parentId, itemName: event.target.value }))}
                        className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                        placeholder="ชื่อโครงการใหญ่"
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs font-semibold text-slate-600">กิจกรรมที่</span>
                      <input
                        value={majorProjectForm.activitySequenceLabel}
                        onChange={(event) => setMajorProjectForm((current) => ({ ...current, parentId: selectedMainCategory?.id ?? current.parentId, activitySequenceLabel: event.target.value }))}
                        className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                        placeholder="เช่น 1.1"
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs font-semibold text-slate-600">ชื่อกิจกรรม</span>
                      <input
                        value={majorProjectForm.activityLabel}
                        onChange={(event) => setMajorProjectForm((current) => ({ ...current, parentId: selectedMainCategory?.id ?? current.parentId, activityLabel: event.target.value }))}
                        className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                        placeholder="ชื่อกิจกรรมของโครงการใหญ่"
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs font-semibold text-slate-600">วงเงินโครงการใหญ่</span>
                      <input
                        value={majorProjectForm.plannedBudgetAmount}
                        onChange={(event) => setMajorProjectForm((current) => ({ ...current, parentId: selectedMainCategory?.id ?? current.parentId, plannedBudgetAmount: event.target.value }))}
                        className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                        placeholder="จำนวนเงิน"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => void saveMajorProjectForm()}
                      disabled={saving || !majorProjectForm.itemName.trim() || !majorProjectForm.activitySequenceLabel.trim() || !majorProjectForm.activityLabel.trim() || !majorProjectForm.plannedBudgetAmount.trim()}
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-teal-700 px-4 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {majorProjectForm.itemId ? <Save className="h-4 w-4" aria-hidden="true" /> : <Plus className="h-4 w-4" aria-hidden="true" />}
                      {majorProjectForm.itemId ? 'บันทึก' : 'เพิ่มโครงการใหญ่'}
                    </button>
                  </div>
                </div>
              ) : null}
              {isOperationsCategorySelected && selectedCategoryMajorProjects.length > 0 ? (
                <label className="block sm:col-span-2">
                  <span className="text-xs font-semibold text-slate-600">เลือกโครงการใหญ่เพื่อสร้างกิจกรรมย่อย</span>
                  <select
                    value={selectedMajorProjectId}
                    onChange={(event) => {
                      const majorProjectId = event.target.value;
                      setSelectedMajorProjectId(majorProjectId);
                      setSelectedSubActivityId('');
                      setSubActivityForm({ ...emptySubActivityForm, parentId: majorProjectId });
                      setChildForm(emptyChildForm);
                    }}
                    className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                  >
                    <option value="">เลือกโครงการใหญ่</option>
                    {selectedCategoryMajorProjects.map((project, index) => (
                      <option key={project.id} value={project.id}>
                        โครงการใหญ่ลำดับที่ {index + 1}: {project.item_name}
                        {project.activity_sequence_label ? ` · กิจกรรมที่ ${project.activity_sequence_label}` : ''}
                      </option>
                    ))}
                  </select>
                  <span className="mt-1 block text-xs text-slate-500">
                    กิจกรรมย่อยจะถูกจัดเก็บและแสดงตามลำดับภายใต้โครงการใหญ่ที่เลือก
                  </span>
                </label>
              ) : null}
              {isOperationsCategorySelected && selectedMajorProject ? (
                <div className="rounded-md border border-sky-200 bg-sky-50/50 p-3 sm:col-span-2">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-950">
                        {subActivityForm.itemId ? 'แก้ไขกิจกรรมย่อย' : 'สร้างโครงการย่อย'}
                      </h3>
                      <p className="mt-0.5 text-xs text-slate-500">กิจกรรมย่อยจะอยู่ภายใต้โครงการใหญ่: {selectedMajorProject.item_name}</p>
                    </div>
                    {subActivityForm.itemId ? (
                      <button
                        type="button"
                        onClick={() => setSubActivityForm({ ...emptySubActivityForm, parentId: selectedMajorProject.id })}
                        className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2.5 text-xs font-semibold text-slate-600"
                      >
                        <X className="h-3.5 w-3.5" aria-hidden="true" />
                        ยกเลิก
                      </button>
                    ) : null}
                  </div>
                  <div className="grid gap-3 lg:grid-cols-[minmax(9rem,0.4fr)_minmax(0,1fr)_minmax(10rem,0.55fr)_auto] lg:items-end">
                    <label className="block">
                      <span className="text-xs font-semibold text-slate-600">กิจกรรมย่อยที่</span>
                      <input
                        value={subActivityForm.activitySequenceLabel}
                        onChange={(event) => setSubActivityForm((current) => ({ ...current, parentId: selectedMajorProject.id, activitySequenceLabel: event.target.value }))}
                        className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                        placeholder="เช่น 1.1.1"
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs font-semibold text-slate-600">ชื่อกิจกรรมย่อย</span>
                      <input
                        value={subActivityForm.itemName}
                        onChange={(event) => setSubActivityForm((current) => ({ ...current, parentId: selectedMajorProject.id, itemName: event.target.value }))}
                        className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                        placeholder="ชื่อกิจกรรมย่อย"
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs font-semibold text-slate-600">วงเงินกิจกรรมย่อย</span>
                      <input
                        value={subActivityForm.plannedBudgetAmount}
                        onChange={(event) => setSubActivityForm((current) => ({ ...current, parentId: selectedMajorProject.id, plannedBudgetAmount: event.target.value }))}
                        className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                        placeholder="จำนวนเงิน"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => void saveSubActivityForm()}
                      disabled={saving || !subActivityForm.activitySequenceLabel.trim() || !subActivityForm.itemName.trim() || !subActivityForm.plannedBudgetAmount.trim()}
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-sky-700 px-4 text-sm font-semibold text-white transition hover:bg-sky-800 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {subActivityForm.itemId ? <Save className="h-4 w-4" aria-hidden="true" /> : <Plus className="h-4 w-4" aria-hidden="true" />}
                      {subActivityForm.itemId ? 'บันทึก' : 'เพิ่มกิจกรรมย่อย'}
                    </button>
                  </div>
                </div>
              ) : null}
              {isOperationsCategorySelected && selectedMajorProjectSubActivities.length > 0 ? (
                <label className="block sm:col-span-2">
                  <span className="text-xs font-semibold text-slate-600">เลือกกิจกรรมย่อยเพื่อสร้างกิจกรรม</span>
                  <select
                    value={selectedSubActivityId}
                    onChange={(event) => {
                      const subActivityId = event.target.value;
                      setSelectedSubActivityId(subActivityId);
                      setChildForm({ ...emptyChildForm, parentId: subActivityId, rowType: 'activity' });
                    }}
                    className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  >
                    <option value="">เลือกกิจกรรมย่อย</option>
                    {selectedMajorProjectSubActivities.map((subActivity, index) => (
                      <option key={subActivity.id} value={subActivity.id}>
                        กิจกรรมย่อยลำดับที่ {index + 1}: {subActivity.item_name}
                        {subActivity.activity_sequence_label ? ` · ${subActivity.activity_sequence_label}` : ''}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              {!isOperationsCategorySelected ? (
                <>
                  <input value={childForm.outputLabel} onChange={(event) => setChildForm((current) => ({ ...current, outputLabel: event.target.value }))} className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100" placeholder="ผลผลิตที่" />
                  <input value={childForm.activityLabel} onChange={(event) => setChildForm((current) => ({ ...current, activityLabel: event.target.value }))} className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100" placeholder="กิจกรรมหลักที่" />
                  <input value={childForm.itemName} onChange={(event) => setChildForm((current) => ({ ...current, itemName: event.target.value }))} className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100 sm:col-span-2" placeholder="ชื่อรายการ เช่น ค่าตอบแทนพนักงานราชการ" />
                  <input value={childForm.plannedBudgetAmount} onChange={(event) => setChildForm((current) => ({ ...current, plannedBudgetAmount: event.target.value }))} className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100" placeholder="วงเงินงบประมาณ" />
                </>
              ) : null}
              {isOperationsCategorySelected && selectedSubActivity ? (
                <div className="grid gap-3 rounded-md border border-indigo-200 bg-indigo-50/40 p-3 sm:col-span-2 sm:grid-cols-[minmax(9rem,0.45fr)_minmax(0,1fr)_minmax(10rem,0.55fr)]">
                  <label className="block">
                    <span className="text-xs font-semibold text-slate-600">กิจกรรมที่</span>
                    <input value={childForm.activitySequenceLabel} onChange={(event) => setChildForm((current) => ({ ...current, activitySequenceLabel: event.target.value }))} className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" placeholder="เช่น 1.1.1.1" />
                  </label>
                  <label className="block">
                    <span className="text-xs font-semibold text-slate-600">ชื่อกิจกรรม</span>
                    <input value={childForm.itemName} onChange={(event) => setChildForm((current) => ({ ...current, itemName: event.target.value }))} className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" placeholder="ชื่อกิจกรรม" />
                  </label>
                  <label className="block">
                    <span className="text-xs font-semibold text-slate-600">วงเงินกิจกรรม</span>
                    <input value={childForm.plannedBudgetAmount} onChange={(event) => setChildForm((current) => ({ ...current, plannedBudgetAmount: event.target.value }))} className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" placeholder="จำนวนเงิน" />
                  </label>
                </div>
              ) : null}
            </div>
            {!isOperationsCategorySelected || selectedSubActivity ? (
              <button
                type="button"
                onClick={() => void saveChildForm()}
                disabled={saving || !childForm.parentId || !childForm.itemName.trim()}
                className="mt-3 inline-flex items-center gap-2 rounded-md bg-sky-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {childForm.itemId ? <Save className="h-4 w-4" aria-hidden="true" /> : <Plus className="h-4 w-4" aria-hidden="true" />}
                {saving ? 'กำลังบันทึก...' : childForm.itemId ? 'บันทึกรายการงบประมาณ' : selectedSubActivity ? 'เพิ่มกิจกรรม' : 'เพิ่มรายการงบประมาณ'}
              </button>
            ) : null}
            {isOperationsCategorySelected && selectedSubActivity ? (
              <div className="mt-4 overflow-hidden rounded-md border border-indigo-200 bg-white">
                <div className="flex flex-col gap-2 border-b border-indigo-100 bg-indigo-50/60 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">รายการงบประมาณภายใต้กิจกรรมย่อยที่เลือก</h3>
                    <p className="mt-1 text-xs text-slate-600">{selectedSubActivity.item_name}</p>
                    <p className="mt-1 text-xs text-indigo-700">กดรายการเพื่อเลือกสำหรับจัดสรรงวดและกรอกข้อมูลงบประมาณ</p>
                  </div>
                  <span className="w-fit rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-800">
                    {selectedSubActivityBudgetItems.length} รายการ
                  </span>
                </div>
                {selectedSubActivityBudgetItems.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 text-sm">
                      <thead className="bg-slate-50 text-left text-xs font-semibold text-slate-600">
                        <tr>
                          <th className="w-40 px-4 py-3">กิจกรรมที่</th>
                          <th className="px-4 py-3">ชื่อรายการงบประมาณ</th>
                          <th className="w-48 px-4 py-3 text-right">วงเงินงบประมาณ</th>
                          <th className="w-44 px-4 py-3 text-right">เลือก / จัดการ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {selectedSubActivityBudgetItems.map((item, index) => {
                          const isSelected = selectedAllocationItem?.id === item.id
                            && selectedDisbursementItem?.id === item.id;

                          return (
                            <tr
                              key={item.id}
                              onClick={() => selectSubActivityBudgetItem(item)}
                              className={`cursor-pointer text-slate-700 transition ${isSelected ? 'bg-indigo-50' : 'hover:bg-slate-50'}`}
                            >
                              <td className="whitespace-nowrap px-4 py-3 font-medium text-indigo-800">
                                {item.activity_sequence_label ?? item.sequence_label ?? index + 1}
                              </td>
                              <td className="px-4 py-3 font-medium text-slate-900">
                                {item.item_name}
                                {isSelected ? <span className="ml-2 text-xs font-semibold text-indigo-700">เลือกแล้ว</span> : null}
                              </td>
                              <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-slate-900">
                                {formatBudgetAmount(item.amount.planned_budget_amount)}
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex justify-end gap-1.5">
                                  <button
                                    type="button"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      selectSubActivityBudgetItem(item);
                                    }}
                                    className={`inline-flex h-9 items-center justify-center rounded-md border p-2 transition ${isSelected ? 'border-indigo-300 bg-indigo-100 text-indigo-700' : 'border-indigo-200 bg-white text-indigo-600 hover:bg-indigo-50'}`}
                                    aria-label={`เลือก ${item.item_name} สำหรับกรอกข้อมูลงบประมาณ`}
                                    aria-pressed={isSelected}
                                    title="เลือกสำหรับกรอกข้อมูล"
                                  >
                                    <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      startEdit(item);
                                    }}
                                    className="inline-flex h-9 items-center justify-center rounded-md border border-slate-200 bg-white p-2 text-slate-600 transition hover:bg-slate-50 hover:text-sky-700"
                                    aria-label={`แก้ไข ${item.item_name}`}
                                    title="แก้ไขรายการ"
                                  >
                                    <Edit3 className="h-4 w-4" aria-hidden="true" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      setDeleteTarget(item);
                                    }}
                                    className="inline-flex h-9 items-center justify-center rounded-md border border-red-200 bg-white p-2 text-red-600 transition hover:bg-red-50"
                                    aria-label={`ลบ ${item.item_name}`}
                                    title="ลบรายการ"
                                  >
                                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="px-4 py-5 text-sm text-slate-500">ยังไม่มีรายการงบประมาณภายใต้กิจกรรมย่อยนี้</p>
                )}
              </div>
            ) : null}
          </section>

          <div className="mt-4 border-b border-slate-200" role="tablist" aria-label="ส่วนงานรายการงบประมาณ">
            <div className="flex min-w-max gap-6 overflow-x-auto px-1">
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'transactions'}
                onClick={() => setActiveTab('transactions')}
                className={`inline-flex h-11 items-center gap-2 border-b-2 px-1 text-sm font-semibold transition ${activeTab === 'transactions' ? 'border-sky-700 text-sky-800' : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800'}`}
              >
                <WalletCards className="h-4 w-4" aria-hidden="true" />
                บันทึกข้อมูลงบประมาณ
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'items'}
                onClick={() => setActiveTab('items')}
                className={`inline-flex h-11 items-center gap-2 border-b-2 px-1 text-sm font-semibold transition ${activeTab === 'items' ? 'border-sky-700 text-sky-800' : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800'}`}
              >
                <Table2 className="h-4 w-4" aria-hidden="true" />
                รายการงบประมาณทั้งหมด
              </button>
            </div>
          </div>

          {activeTab === 'transactions' ? (
          <div className="mt-4 space-y-4" role="tabpanel">
          <div className="grid gap-4 md:grid-cols-2">
            <button
              type="button"
              onClick={() => setIsAllocationEntryOpen(true)}
              className="group rounded-md border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-amber-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-amber-300"
            >
              <span className="flex items-start gap-4">
                <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-amber-100 text-amber-700 transition group-hover:bg-amber-200">
                  <Settings2 className="h-6 w-6" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-base font-bold text-slate-950">จัดสรรงวด</span>
                  <span className="mt-1 block text-sm text-slate-600">เลือกรายการ งวด วันที่ และจำนวนเงินจัดสรร</span>
                  <span className="mt-3 block truncate text-xs font-semibold text-amber-800">
                    {selectedAllocationItem ? `รายการที่เลือก: ${getBudgetItemSearchLabel(selectedAllocationItem)}` : 'กดเพื่อเลือกรายการและกรอกข้อมูล'}
                  </span>
                </span>
              </span>
            </button>
            <button
              type="button"
              onClick={() => setIsBudgetDataEntryOpen(true)}
              className="group rounded-md border border-sky-200 bg-gradient-to-br from-sky-50 to-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-sky-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-sky-300"
            >
              <span className="flex items-start gap-4">
                <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-sky-100 text-sky-700 transition group-hover:bg-sky-200">
                  <WalletCards className="h-6 w-6" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-base font-bold text-slate-950">กรอกข้อมูลงบประมาณ</span>
                  <span className="mt-1 block text-sm text-slate-600">เลือกส่วนกลางกรมฯ ภายในกรม ภายในกอง ผูกพัน หรือเบิก-จ่าย</span>
                  <span className="mt-3 block truncate text-xs font-semibold text-sky-800">
                    {selectedDisbursementItem ? `รายการที่เลือก: ${getBudgetItemSearchLabel(selectedDisbursementItem)}` : 'กดเพื่อเลือกรายการและกรอกข้อมูล'}
                  </span>
                </span>
              </span>
            </button>
          </div>

          {isAllocationEntryOpen ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6" role="dialog" aria-modal="true" aria-labelledby="allocation-entry-title">
            <button type="button" className="absolute inset-0 bg-slate-950/55 backdrop-blur-sm" onClick={() => setIsAllocationEntryOpen(false)} aria-label="ปิดหน้าต่างจัดสรรงวด" />
            <div className="relative flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-md bg-white shadow-2xl">
              <div className="flex shrink-0 items-center justify-between border-b border-amber-200 bg-amber-50 px-4 py-3 sm:px-6">
                <div>
                  <h2 id="allocation-entry-title" className="text-lg font-bold text-slate-950">จัดสรรงวด</h2>
                  <p className="mt-1 text-xs text-slate-600">เลือกรายการงบประมาณและบันทึกยอดจัดสรรตามงวด</p>
                </div>
                <button type="button" onClick={() => setIsAllocationEntryOpen(false)} disabled={saving} className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-amber-200 bg-white text-slate-600 transition hover:bg-amber-100 disabled:opacity-50" aria-label="ปิด">
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
          <section className="flex min-w-0 flex-col rounded-md border border-amber-200 bg-amber-50/40 p-4 shadow-sm">
            <div className="mb-3 space-y-3">
              <div>
                <h2 className="text-base font-semibold text-slate-950">จัดสรรงวด</h2>
                <p className="mt-1 text-xs text-slate-500">บันทึกยอดจัดสรรแยกเป็นงวด พร้อมวันที่กำกับของแต่ละรายการงบประมาณ</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setTrancheDrafts(trancheDefinitions);
                  setTrancheForm(emptyTrancheForm);
                  setIsTrancheManagerOpen(true);
                }}
                className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-md border border-amber-300 bg-white px-3 text-sm font-semibold text-amber-800 transition hover:bg-amber-50"
              >
                <Settings2 className="h-4 w-4" aria-hidden="true" />
                จัดการงวด
              </button>
            </div>
            <div className="flex flex-1 flex-col gap-3">
              <div>
                <label htmlFor="allocation-budget-item-search" className="text-xs font-semibold text-slate-600">รายการงบประมาณ</label>
                <div className="relative mt-1">
                  <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" aria-hidden="true" />
                  <input
                    id="allocation-budget-item-search"
                    type="search"
                    value={allocationItemSearch}
                    onChange={(event) => {
                      const nextValue = event.target.value;
                      setAllocationItemSearch(nextValue);
                      if (selectedAllocationItem && nextValue !== getBudgetItemSearchLabel(selectedAllocationItem)) {
                        setAllocationForm((current) => ({ ...current, itemId: '' }));
                        applySelectedAllocationItemValue(null, allocationForm.trancheKey);
                      }
                    }}
                    aria-controls="allocation-budget-item-results"
                    className="h-10 w-full rounded-md border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
                    placeholder="ค้นหาเลขลำดับหรือชื่อรายการ"
                  />
                </div>
                <div id="allocation-budget-item-results" role="listbox" aria-label="ผลการค้นหารายการงบประมาณสำหรับจัดสรรงวด" className="mt-2 max-h-60 overflow-y-auto rounded-md border border-amber-200 bg-white p-1">
                  {allocationItemSearchResults.length > 0 ? allocationItemSearchResults.map(({ item, label }) => (
                    <button
                      key={item.id}
                      type="button"
                      role="option"
                      aria-selected={selectedAllocationItem?.id === item.id}
                      onClick={() => selectAllocationBudgetItem(item)}
                      className={`block w-full rounded px-2.5 py-2 text-left text-xs transition ${selectedAllocationItem?.id === item.id ? 'bg-amber-100 font-semibold text-amber-950' : 'text-slate-700 hover:bg-amber-50'}`}
                    >
                      {label}
                    </button>
                  )) : (
                    <p className="px-3 py-4 text-center text-xs text-slate-500">ไม่พบรายการที่ใกล้เคียง</p>
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
                    <option key={tranche.key} value={tranche.key}>{tranche.label}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-slate-600">วันที่จัดสรร</span>
                <input
                  type="date"
                  value={allocationForm.allocationDate}
                  onChange={(event) => setAllocationForm((current) => ({ ...current, allocationDate: event.target.value }))}
                  className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-slate-600">จำนวนเงิน</span>
                <input
                  value={allocationForm.amount}
                  onChange={(event) => setAllocationForm((current) => ({ ...current, amount: event.target.value }))}
                  className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
                  placeholder="ยอดจัดสรร"
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-slate-600">เลขที่หนังสือ</span>
                <input value={allocationForm.documentNumber} onChange={(event) => setAllocationForm((current) => ({ ...current, documentNumber: event.target.value }))} maxLength={200} className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100" placeholder="เช่น สธ 0434.3ว 259" />
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
          ) : null}

          {false ? (
          <>
          <section className="flex min-w-0 flex-col rounded-md border border-cyan-200 bg-cyan-50/40 p-4 shadow-sm">
            <div className="mb-3">
              <h2 className="text-base font-semibold text-slate-950">ส่วนกลางกรมฯ</h2>
              <p className="mt-1 text-xs text-slate-500">บันทึกยอดรับโอนและโอนออกจากส่วนกลางกรมฯ สำหรับคำนวณงบสุทธิและคงเหลือ</p>
            </div>
            <div className="flex flex-1 flex-col gap-3">
              <label className="block">
                <span className="text-xs font-semibold text-slate-600">รายการงบประมาณ</span>
                <select
                  value={centralTransferForm.itemId}
                  onChange={(event) => {
                    const nextItem = budgetLineItems.find((item) => item.id === event.target.value) ?? null;
                    setCentralTransferForm((current) => ({ ...current, itemId: event.target.value }));
                    applySelectedCentralTransferItemValue(nextItem);
                  }}
                  className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                >
                  <option value="">เลือกรายการงบประมาณ</option>
                  {budgetLineItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.sequence_label ? `${item.sequence_label} ` : ''}
                      {item.item_name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-slate-600">รับโอน</span>
                <input
                  value={centralTransferForm.centralTransferInAmount}
                  onChange={(event) => setCentralTransferForm((current) => ({ ...current, centralTransferInAmount: event.target.value }))}
                  className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                  placeholder="ยอดรับโอน"
                />
                <input value={centralTransferForm.centralTransferInDocumentNumber} onChange={(event) => setCentralTransferForm((current) => ({ ...current, centralTransferInDocumentNumber: event.target.value }))} maxLength={200} className="mt-2 h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100" placeholder="เลขที่หนังสือรับโอน" />
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-slate-600">โอนออก</span>
                <input
                  value={centralTransferForm.centralTransferOutAmount}
                  onChange={(event) => setCentralTransferForm((current) => ({ ...current, centralTransferOutAmount: event.target.value }))}
                  className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                  placeholder="ยอดโอนออก"
                />
                <input value={centralTransferForm.centralTransferOutDocumentNumber} onChange={(event) => setCentralTransferForm((current) => ({ ...current, centralTransferOutDocumentNumber: event.target.value }))} maxLength={200} className="mt-2 h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100" placeholder="เลขที่หนังสือโอนออก" />
              </label>
              <button
                type="button"
                onClick={() => void saveCentralTransferForm()}
                disabled={saving || !centralTransferForm.itemId}
                className="mt-auto inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-cyan-700 px-4 text-sm font-semibold text-white transition hover:bg-cyan-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Save className="h-4 w-4" aria-hidden="true" />
                บันทึกส่วนกลาง
              </button>
            </div>
          </section>

          <section className="flex min-w-0 flex-col rounded-md border border-blue-200 bg-blue-50/40 p-4 shadow-sm">
            <div className="mb-3">
              <h2 className="text-base font-semibold text-slate-950">ภายในกรม</h2>
              <p className="mt-1 text-xs text-slate-500">บันทึกยอดขอเพิ่มและโอนออกภายในกรม สำหรับคำนวณงบสุทธิและคงเหลือ</p>
            </div>
            <div className="flex flex-1 flex-col gap-3">
              <label className="block">
                <span className="text-xs font-semibold text-slate-600">รายการงบประมาณ</span>
                <select
                  value={departmentTransferForm.itemId}
                  onChange={(event) => {
                    const nextItem = budgetLineItems.find((item) => item.id === event.target.value) ?? null;
                    setDepartmentTransferForm((current) => ({ ...current, itemId: event.target.value }));
                    applySelectedDepartmentTransferItemValue(nextItem);
                  }}
                  className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="">เลือกรายการงบประมาณ</option>
                  {budgetLineItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.sequence_label ? `${item.sequence_label} ` : ''}
                      {item.item_name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-slate-600">ขอเพิ่ม</span>
                <input
                  value={departmentTransferForm.departmentRequestIncreaseAmount}
                  onChange={(event) => setDepartmentTransferForm((current) => ({ ...current, departmentRequestIncreaseAmount: event.target.value }))}
                  className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  placeholder="ยอดขอเพิ่ม"
                />
                <input value={departmentTransferForm.departmentRequestIncreaseDocumentNumber} onChange={(event) => setDepartmentTransferForm((current) => ({ ...current, departmentRequestIncreaseDocumentNumber: event.target.value }))} maxLength={200} className="mt-2 h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" placeholder="เลขที่หนังสือขอเพิ่ม" />
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-slate-600">โอนออก</span>
                <input
                  value={departmentTransferForm.departmentTransferOutAmount}
                  onChange={(event) => setDepartmentTransferForm((current) => ({ ...current, departmentTransferOutAmount: event.target.value }))}
                  className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  placeholder="ยอดโอนออก"
                />
                <input value={departmentTransferForm.departmentTransferOutDocumentNumber} onChange={(event) => setDepartmentTransferForm((current) => ({ ...current, departmentTransferOutDocumentNumber: event.target.value }))} maxLength={200} className="mt-2 h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" placeholder="เลขที่หนังสือโอนออก" />
              </label>
              <button
                type="button"
                onClick={() => void saveDepartmentTransferForm()}
                disabled={saving || !departmentTransferForm.itemId}
                className="mt-auto inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-blue-700 px-4 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Save className="h-4 w-4" aria-hidden="true" />
                บันทึกภายในกรม
              </button>
            </div>
          </section>

          <section className="flex min-w-0 flex-col rounded-md border border-orange-200 bg-orange-50/40 p-4 shadow-sm">
            <div className="mb-3">
              <h2 className="text-base font-semibold text-slate-950">ภายในกอง</h2>
              <p className="mt-1 text-xs text-slate-500">บันทึกยอดรับโอนและโอนออกภายในกอง สำหรับแสดงในรายการงบประมาณทั้งหมด</p>
            </div>
            <div className="flex flex-1 flex-col gap-3">
              <label className="block">
                <span className="text-xs font-semibold text-slate-600">รายการงบประมาณ</span>
                <select
                  value={divisionTransferForm.itemId}
                  onChange={(event) => {
                    const nextItem = budgetLineItems.find((item) => item.id === event.target.value) ?? null;
                    setDivisionTransferForm((current) => ({ ...current, itemId: event.target.value }));
                    applySelectedDivisionTransferItemValue(nextItem);
                  }}
                  className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                >
                  <option value="">เลือกรายการงบประมาณ</option>
                  {budgetLineItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.sequence_label ? `${item.sequence_label} ` : ''}
                      {item.item_name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-slate-600">รับโอน</span>
                <input
                  value={divisionTransferForm.divisionTransferInAmount}
                  onChange={(event) => setDivisionTransferForm((current) => ({ ...current, divisionTransferInAmount: event.target.value }))}
                  className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                  placeholder="ยอดรับโอน"
                />
                <input value={divisionTransferForm.divisionTransferInDocumentNumber} onChange={(event) => setDivisionTransferForm((current) => ({ ...current, divisionTransferInDocumentNumber: event.target.value }))} maxLength={200} className="mt-2 h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100" placeholder="เลขที่หนังสือรับโอน" />
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-slate-600">โอนออก</span>
                <input
                  value={divisionTransferForm.divisionTransferOutAmount}
                  onChange={(event) => setDivisionTransferForm((current) => ({ ...current, divisionTransferOutAmount: event.target.value }))}
                  className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                  placeholder="ยอดโอนออก"
                />
                <input value={divisionTransferForm.divisionTransferOutDocumentNumber} onChange={(event) => setDivisionTransferForm((current) => ({ ...current, divisionTransferOutDocumentNumber: event.target.value }))} maxLength={200} className="mt-2 h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100" placeholder="เลขที่หนังสือโอนออก" />
              </label>
              <button
                type="button"
                onClick={() => void saveDivisionTransferForm()}
                disabled={saving || !divisionTransferForm.itemId}
                className="mt-auto inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-orange-600 px-4 text-sm font-semibold text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Save className="h-4 w-4" aria-hidden="true" />
                บันทึกภายในกอง
              </button>
            </div>
          </section>

          <section className="flex min-w-0 flex-col rounded-md border border-purple-200 bg-purple-50/40 p-4 shadow-sm">
            <div className="mb-3">
              <h2 className="text-base font-semibold text-slate-950">ผูกพัน</h2>
              <p className="mt-1 text-xs text-slate-500">บันทึกยอดผูกพันแบบมี PO และไม่มี PO ระบบจะรวมยอดไปแสดงในช่องผูกพันรวม</p>
            </div>
            <div className="flex flex-1 flex-col gap-3">
              <label className="block">
                <span className="text-xs font-semibold text-slate-600">รายการงบประมาณ</span>
                <select
                  value={commitmentForm.itemId}
                  onChange={(event) => {
                    const nextItem = budgetLineItems.find((item) => item.id === event.target.value) ?? null;
                    setCommitmentForm((current) => ({ ...current, itemId: event.target.value }));
                    applySelectedCommitmentItemValue(nextItem);
                  }}
                  className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
                >
                  <option value="">เลือกรายการงบประมาณ</option>
                  {budgetLineItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.sequence_label ? `${item.sequence_label} ` : ''}
                      {item.item_name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-slate-600">มี PO</span>
                <input
                  value={commitmentForm.committedPoAmount}
                  onChange={(event) => setCommitmentForm((current) => ({ ...current, committedPoAmount: event.target.value }))}
                  className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
                  placeholder="ยอดมี PO"
                />
                <input value={commitmentForm.committedPoDocumentNumber} onChange={(event) => setCommitmentForm((current) => ({ ...current, committedPoDocumentNumber: event.target.value }))} maxLength={200} className="mt-2 h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100" placeholder="เลขที่หนังสือมี PO" />
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-slate-600">ไม่มี PO</span>
                <input
                  value={commitmentForm.committedWithoutPoAmount}
                  onChange={(event) => setCommitmentForm((current) => ({ ...current, committedWithoutPoAmount: event.target.value }))}
                  className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
                  placeholder="ยอดไม่มี PO"
                />
                <input value={commitmentForm.committedWithoutPoDocumentNumber} onChange={(event) => setCommitmentForm((current) => ({ ...current, committedWithoutPoDocumentNumber: event.target.value }))} maxLength={200} className="mt-2 h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100" placeholder="เลขที่หนังสือไม่มี PO" />
              </label>
              <button
                type="button"
                onClick={() => void saveCommitmentForm()}
                disabled={saving || !commitmentForm.itemId}
                className="mt-auto inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-purple-700 px-4 text-sm font-semibold text-white transition hover:bg-purple-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Save className="h-4 w-4" aria-hidden="true" />
                บันทึกผูกพัน
              </button>
            </div>
          </section>

          <section className={`flex min-w-0 flex-col rounded-md border border-emerald-200 bg-emerald-50/40 p-4 shadow-sm ${selectedDisbursementItem ? '2xl:col-span-2' : ''}`}>
            <div className="mb-3">
              <h2 className="text-base font-semibold text-slate-950">เบิก-จ่าย</h2>
              <p className="mt-1 text-xs text-slate-500">บันทึกยอดเบิกจ่ายทั่วไปและเงินยืมราชการ ระบบจะรวมยอดไปแสดงในช่องเบิกจ่ายรวม</p>
            </div>
            <div className="flex flex-1 flex-col gap-3">
              <label className="block">
                <span className="text-xs font-semibold text-slate-600">รายการงบประมาณ</span>
                <select
                  value={disbursementForm.itemId}
                  onChange={(event) => {
                    const nextItem = budgetLineItems.find((item) => item.id === event.target.value) ?? null;
                    setDisbursementForm((current) => ({ ...current, itemId: event.target.value }));
                    applySelectedDisbursementItemValue(nextItem);
                  }}
                  className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                >
                  <option value="">เลือกรายการงบประมาณ</option>
                  {budgetLineItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.sequence_label ? `${item.sequence_label} ` : ''}
                      {item.item_name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-slate-600">เบิกจ่ายทั่วไป</span>
                <input
                  value={disbursementForm.disbursedGeneralAmount}
                  onChange={(event) => setDisbursementForm((current) => ({ ...current, disbursedGeneralAmount: event.target.value }))}
                  className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                  placeholder="ยอดเบิกจ่ายทั่วไป"
                />
                <input value={disbursementForm.disbursedGeneralDocumentNumber} onChange={(event) => setDisbursementForm((current) => ({ ...current, disbursedGeneralDocumentNumber: event.target.value }))} maxLength={200} className="mt-2 h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" placeholder="เลขที่หนังสือเบิกจ่ายทั่วไป" />
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-slate-600">เงินยืมราชการ</span>
                <input
                  value={disbursementForm.disbursedAdvanceAmount}
                  onChange={(event) => setDisbursementForm((current) => ({ ...current, disbursedAdvanceAmount: event.target.value }))}
                  className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                  placeholder="ยอดเงินยืมราชการ"
                />
                <input value={disbursementForm.disbursedAdvanceDocumentNumber} onChange={(event) => setDisbursementForm((current) => ({ ...current, disbursedAdvanceDocumentNumber: event.target.value }))} maxLength={200} className="mt-2 h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" placeholder="เลขที่หนังสือเงินยืมราชการ" />
              </label>
              <button
                type="button"
                onClick={() => void saveDisbursementForm()}
                disabled={saving || !disbursementForm.itemId}
                className="mt-auto inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Save className="h-4 w-4" aria-hidden="true" />
                บันทึกเบิก-จ่าย
              </button>
            </div>
          </section>
          </>
          ) : null}

          {isBudgetDataEntryOpen ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6" role="dialog" aria-modal="true" aria-labelledby="budget-data-entry-title">
            <button type="button" className="absolute inset-0 bg-slate-950/55 backdrop-blur-sm" onClick={() => setIsBudgetDataEntryOpen(false)} aria-label="ปิดหน้าต่างกรอกข้อมูลงบประมาณ" />
            <div className="relative flex max-h-[94vh] w-full max-w-7xl flex-col overflow-hidden rounded-md bg-white shadow-2xl">
              <div className="flex shrink-0 items-center justify-between border-b border-sky-200 bg-sky-50 px-4 py-3 sm:px-6">
                <div className="min-w-0">
                  <h2 id="budget-data-entry-title" className="text-lg font-bold text-slate-950">กรอกข้อมูลงบประมาณ</h2>
                  <p className="mt-1 truncate text-xs text-slate-600">
                    {selectedDisbursementItem ? getBudgetItemSearchLabel(selectedDisbursementItem) : 'ค้นหาและเลือกรายการที่ต้องการกรอกข้อมูล'}
                  </p>
                </div>
                <button type="button" onClick={() => setIsBudgetDataEntryOpen(false)} disabled={saving} className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-sky-200 bg-white text-slate-600 transition hover:bg-sky-100 disabled:opacity-50" aria-label="ปิด">
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50 p-4 sm:p-6">
          <div className="min-w-0 space-y-4">
            <section className="rounded-md border border-sky-200 bg-sky-50/40 p-4 shadow-sm">
              <div className="mb-3">
                <h2 className="text-base font-semibold text-slate-950">เลือกรายการงบประมาณเพื่อกรอกข้อมูล</h2>
                <p className="mt-1 text-xs text-slate-500">ค้นหาด้วยเลขลำดับหรือชื่อรายการ แล้วกดช่องข้อมูลด้านล่างที่ต้องการเพิ่มหรือแก้ไข</p>
              </div>
              <div>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" aria-hidden="true" />
                  <input
                    type="search"
                    value={transactionItemSearch}
                    onChange={(event) => {
                      const nextValue = event.target.value;
                      setTransactionItemSearch(nextValue);
                      if (selectedDisbursementItem && nextValue !== getBudgetItemSearchLabel(selectedDisbursementItem)) {
                        setDisbursementForm(initialDisbursementForm);
                        applySelectedDisbursementItemValue(null);
                      }
                    }}
                    aria-controls="budget-transaction-search-results"
                    className="h-11 w-full rounded-md border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                    placeholder="พิมพ์เลขลำดับหรือชื่อรายการงบประมาณ"
                  />
                </div>
                <div id="budget-transaction-search-results" role="listbox" aria-label="ผลการค้นหารายการงบประมาณ" className="mt-2 max-h-72 overflow-y-auto rounded-md border border-sky-200 bg-white p-1">
                  {transactionItemSearchResults.length > 0 ? transactionItemSearchResults.map(({ item, label }) => (
                    <button
                      key={item.id}
                      type="button"
                      role="option"
                      aria-selected={selectedDisbursementItem?.id === item.id}
                      onClick={() => selectTransactionBudgetItem(item)}
                      className={`block w-full rounded px-3 py-2 text-left text-sm transition ${selectedDisbursementItem?.id === item.id ? 'bg-sky-100 font-semibold text-sky-900' : 'text-slate-700 hover:bg-slate-50'}`}
                    >
                      {label}
                    </button>
                  )) : (
                    <p className="px-3 py-4 text-center text-sm text-slate-500">ไม่พบรายการที่ใกล้เคียง</p>
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
                onEditAmount={(field, label, value) => openAmountCellEdit(null, selectedDisbursementItem, field, label, value)}
              />
            </div>
          ) : null}
          </div>
              </div>
            </div>
          </div>
          ) : null}
          </div>
          ) : null}
        </div>
      ) : null}

      {!canManage || activeTab === 'items' ? (
      <section className="rounded-md border border-slate-200 bg-white shadow-sm">
        <div className="sticky top-[121px] z-40 flex flex-col gap-3 rounded-t-md border-b border-slate-200 bg-white/95 px-4 py-3 shadow-sm backdrop-blur sm:flex-row sm:items-center sm:justify-between lg:top-[65px]">
          <h2 className="text-base font-semibold text-slate-950">รายการงบประมาณทั้งหมด</h2>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={openFormulaAudit}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-sky-200 bg-sky-50 px-4 text-sm font-semibold text-sky-800 transition hover:border-sky-300 hover:bg-sky-100"
            >
              <Calculator className="h-4 w-4" aria-hidden="true" />
              ตรวจสอบสูตรและโครงสร้าง
            </button>
            <label className="relative block w-full sm:w-80">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
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
                <th rowSpan={2} className="sticky left-0 z-30 min-w-[320px] border border-slate-200 bg-white px-4 py-3 text-center align-middle shadow-[2px_0_0_0_rgb(226_232_240)]">ชื่อโครงการ</th>
                <th rowSpan={2} className="border border-slate-200 bg-white px-4 py-3 text-center align-middle">วงเงินตามแผน<br />ปี {displayFiscalYear}</th>
                {trancheDefinitions.map((tranche) => (
                  <th
                    key={tranche.key}
                    rowSpan={2}
                    className="min-w-[120px] border border-amber-300 bg-amber-600 px-3 py-3 text-center align-middle text-white"
                  >
                    <span className="block whitespace-normal">{tranche.label}</span>
                    <span className="mt-1 block font-normal text-amber-50">({tranche.trancheNumber})</span>
                  </th>
                ))}
                <th rowSpan={2} className="border border-slate-200 bg-lime-50 px-4 py-3 text-center align-middle">ยอดสุทธิงบประมาณ<br />{displayFiscalYear} หลังโอนเปลี่ยนแปลง<br />(1)</th>
                <th colSpan={2} className="border border-cyan-300 bg-cyan-700 px-4 py-2 text-center font-bold text-white">ส่วนกลางกรมฯ</th>
                <th colSpan={2} className="border border-blue-300 bg-blue-700 px-4 py-2 text-center font-bold text-white">ภายในกรม</th>
                <th colSpan={2} className="border border-orange-300 bg-orange-600 px-4 py-2 text-center font-bold text-white">ภายในกอง</th>
                <th colSpan={3} className="border border-purple-300 bg-purple-700 px-4 py-2 text-center font-bold text-white">ผูกพัน</th>
                <th colSpan={3} className="border border-emerald-300 bg-emerald-700 px-4 py-2 text-center font-bold text-white">เบิก-จ่าย</th>
                <th rowSpan={2} className="border border-slate-200 bg-white px-4 py-3 text-center align-middle">รวม<br />(10)<br />=(6)+(9)</th>
                <th rowSpan={2} className="border border-slate-200 bg-white px-4 py-3 text-center align-middle">คงเหลือ<br />(11)<br />(1)-(10)</th>
                <th rowSpan={2} className="border border-slate-200 bg-white px-4 py-3 text-center align-middle">เบิกจ่ายตามจัดสรร<br />ร้อยละ<br />(12)<br />(9)*100/(1)</th>
                <th rowSpan={2} className="border border-slate-200 bg-sky-100 px-4 py-3 text-center align-middle">เบิกจ่ายตามจัดสรร<br />ร้อยละ<br />(รวม PO)</th>
                {canManage ? <th rowSpan={2} className="border border-slate-200 bg-white px-4 py-3 text-center align-middle">จัดการ</th> : null}
              </tr>
              <tr>
                <th className="border border-cyan-200 bg-cyan-50 px-4 py-2 text-center text-cyan-900">รับโอน<br />(2)</th>
                <th className="border border-cyan-200 bg-cyan-50 px-4 py-2 text-center text-cyan-900">โอนออก<br />(3)</th>
                <th className="border border-blue-200 bg-blue-50 px-4 py-2 text-center text-blue-900">ขอเพิ่ม</th>
                <th className="border border-blue-200 bg-blue-50 px-4 py-2 text-center text-blue-900">โอนออก</th>
                <th className="border border-orange-200 bg-orange-50 px-4 py-2 text-center text-orange-900">รับโอน<br />(2)</th>
                <th className="border border-orange-200 bg-orange-50 px-4 py-2 text-center text-orange-900">โอนออก<br />(3)</th>
                <th className="border border-purple-200 bg-purple-50 px-4 py-2 text-center text-purple-900">มี PO<br />(4)</th>
                <th className="border border-purple-200 bg-purple-50 px-4 py-2 text-center text-purple-900">ไม่มี PO<br />(5)</th>
                <th className="border border-purple-200 bg-purple-50 px-4 py-2 text-center text-purple-900">รวม<br />(6)<br />=(4)+(5)</th>
                <th className="border border-emerald-200 bg-emerald-50 px-4 py-2 text-center text-emerald-900">เบิกจ่ายทั่วไป<br />(7)</th>
                <th className="border border-emerald-200 bg-emerald-50 px-4 py-2 text-center text-emerald-900">เงินยืมราชการ<br />(8)</th>
                <th className="border border-emerald-200 bg-emerald-50 px-4 py-2 text-center text-emerald-900">รวม<br />(9)<br />=(7)+(8)</th>
              </tr>
              <tr className="border-t-2 border-slate-300 bg-slate-900 text-white shadow-sm">
                <th className="sticky left-0 z-30 min-w-[320px] border-r border-slate-700 bg-slate-900 px-4 py-3 text-left">
                  รวมทั้งสิ้น ({filteredItems.length.toLocaleString()} รายการ)
                </th>
                <td className="px-4 py-3 text-right">{formatBudgetAmount(tableTotals.planned_budget_amount)}</td>
                {trancheDefinitions.map((tranche) => {
                  const trancheTotal = tranche.trancheNumber === 1
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
                <td className="px-4 py-3 text-right text-lime-400">{formatBudgetAmount(tableTotals.net_budget_after_transfer_amount)}</td>
                <td className="px-4 py-3 text-right">{formatSignedBudgetAmount(tableTotals.central_transfer_in_amount, '+')}</td>
                <td className="px-4 py-3 text-right">{formatSignedBudgetAmount(tableTotals.central_transfer_out_amount, '-')}</td>
                <td className="px-4 py-3 text-right">{formatSignedBudgetAmount(tableTotals.department_request_increase_amount, '+')}</td>
                <td className="px-4 py-3 text-right">{formatSignedBudgetAmount(tableTotals.department_transfer_out_amount, '-')}</td>
                <td className="px-4 py-3 text-right">{formatSignedBudgetAmount(tableTotals.division_transfer_in_amount, '+')}</td>
                <td className="px-4 py-3 text-right">{formatSignedBudgetAmount(tableTotals.division_transfer_out_amount, '-')}</td>
                <td className="px-4 py-3 text-right text-purple-300">{formatBudgetAmount(tableTotals.committed_po_amount)}</td>
                <td className="px-4 py-3 text-right text-purple-300">{formatBudgetAmount(tableTotals.committed_without_po_amount)}</td>
                <td className="px-4 py-3 text-right text-purple-200">{formatBudgetAmount(tableTotals.committed_total_amount)}</td>
                <td className="px-4 py-3 text-right text-emerald-300">{formatBudgetAmount(tableTotals.disbursed_general_amount)}</td>
                <td className="px-4 py-3 text-right text-emerald-300">{formatBudgetAmount(tableTotals.disbursed_advance_amount)}</td>
                <td className="px-4 py-3 text-right text-emerald-200">{formatBudgetAmount(tableTotals.disbursed_total_amount)}</td>
                <td className="px-4 py-3 text-right text-yellow-300">{formatBudgetAmount(tableTotals.utilization_total_amount)}</td>
                <td className="px-4 py-3 text-right text-sky-300">{formatBudgetAmount(tableTotals.remaining_amount)}</td>
                <td className="px-4 py-3 text-right text-teal-300">{formatBudgetAmount(tableTotals.disbursement_rate ?? 0)}%</td>
                <td className="px-4 py-3 text-right text-sky-300">{formatBudgetAmount(tableTotals.utilization_with_po_rate ?? 0)}%</td>
                {canManage ? <td></td> : null}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && !summary ? (
                <tr><td colSpan={trancheDefinitions.length + (canManage ? 20 : 19)} className="px-4 py-8 text-center text-slate-500">กำลังโหลดข้อมูล...</td></tr>
              ) : filteredItems.length === 0 ? (
                <tr><td colSpan={trancheDefinitions.length + (canManage ? 20 : 19)} className="px-4 py-8 text-center text-slate-500">ยังไม่มีรายการงบประมาณ</td></tr>
              ) : filteredItems.map((item) => {
                const isCategory = item.parent_id === null;
                const isMajorProject = item.row_type === 'major_project'
                  && getDirectChildCount(item.id) > 0;
                const isSubActivity = item.row_type === 'sub_project'
                  && getDirectChildCount(item.id) > 0;
                const isHeading = isCategory || isMajorProject || isSubActivity;
                const itemAmount = rollupMap.get(item.id) ?? normalizeAmount(item.amount);
                const netTotal = itemAmount.net_budget_after_transfer_amount;
                const utilizationTotal = itemAmount.utilization_total_amount;
                const remainingAmount = itemAmount.remaining_amount;
                const disbursementRate = itemAmount.disbursement_rate ?? 0;
                const utilizationRate = itemAmount.utilization_with_po_rate ?? 0;
                const headingAmountClass = isCategory ? 'font-bold text-teal-950' : isMajorProject ? 'font-bold text-sky-950' : isSubActivity ? 'font-semibold text-indigo-950' : undefined;

                return (
                  <tr
                    key={item.id}
                    className={`${isCategory ? 'bg-teal-50/70 font-semibold' : isMajorProject ? 'bg-sky-50/70 font-semibold' : isSubActivity ? 'bg-indigo-50/60 font-semibold' : ''}`}
                  >
                    <td className={`sticky left-0 z-10 min-w-[320px] border-r border-slate-200 px-4 py-3 text-slate-900 ${isCategory ? 'bg-teal-50' : isMajorProject ? 'bg-sky-50' : isSubActivity ? 'bg-indigo-50' : 'bg-white'} shadow-[2px_0_0_0_rgb(226_232_240)]`}>
                      <button
                        type="button"
                        onClick={() => startEdit(item)}
                        className="block w-full rounded-md p-1 text-left transition hover:bg-sky-50 focus:outline-none focus:ring-2 focus:ring-sky-200"
                        style={{ paddingLeft: `${item.depth * 18}px` }}
                        title={canManage ? 'ดูรายละเอียดและแก้ไขรายการงบประมาณ' : 'ดูรายละเอียดรายการงบประมาณ'}
                      >
                        <span className="text-xs text-slate-400">{item.sequence_label}</span>
                        <span className="ml-2">{item.item_name}</span>
                        {!isCategory && (item.output_label || item.activity_sequence_label || item.activity_label) ? (
                          <p className="mt-1 text-xs font-normal text-slate-500">
                            {isMajorProject || isSubActivity
                              ? [item.activity_sequence_label ? `${isSubActivity ? 'โครงการย่อยที่' : 'กิจกรรมที่'} ${item.activity_sequence_label}` : '', item.activity_label ?? ''].filter(Boolean).join(': ')
                              : item.row_type === 'activity'
                                ? (item.activity_sequence_label ? `กิจกรรมที่ ${item.activity_sequence_label}` : null)
                              : (
                                <>
                                  {item.output_label ? `ผลผลิตที่: ${item.output_label}` : null}
                                  {item.output_label && item.activity_label ? ' · ' : null}
                                  {item.activity_label ? `กิจกรรมหลักที่: ${item.activity_label}` : null}
                                </>
                              )}
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
                      {isHeading ? formatBudgetAmount(itemAmount.planned_budget_amount) : (
                        <button
                          type="button"
                          onClick={canManage ? () => startEdit(item) : undefined}
                          disabled={!canManage}
                          className={`w-full rounded px-1 py-1 text-right ${canManage ? 'transition hover:bg-sky-50 hover:text-sky-800 focus:outline-none focus:ring-2 focus:ring-sky-200' : ''}`}
                          title={canManage ? 'แก้ไขวงเงินตามแผน' : undefined}
                        >
                          {formatBudgetAmount(item.amount.planned_budget_amount)}
                        </button>
                      )}
                    </td>
                    {trancheDefinitions.map((tranche) => {
                      const allocation = item.allocations?.find((entry) => entry.tranche_id === tranche.key) ?? null;
                      const legacyAmount = tranche.trancheNumber === 1
                        ? item.amount.allocation_tranche_1_amount
                        : tranche.trancheNumber === 2
                          ? item.amount.allocation_tranche_2_amount
                          : tranche.trancheNumber === 3 ? item.amount.allocation_tranche_3_amount : 0;
                      const trancheValue = tranche.trancheNumber === 1
                        ? itemAmount.allocation_tranche_1_amount
                        : tranche.trancheNumber === 2
                          ? itemAmount.allocation_tranche_2_amount
                          : tranche.trancheNumber === 3
                            ? itemAmount.allocation_tranche_3_amount
                            : (allocation?.amount ?? 0);
                      const displayedAllocation = allocation?.amount ?? legacyAmount;
                      const allocationDocumentNumber = getDocumentNumber(item, `allocation:${tranche.key}`);
                      const hasAllocationData = Math.abs(displayedAllocation) > 0.005
                        || Boolean(allocation?.allocation_date)
                        || Boolean(allocationDocumentNumber);

                      return (
                        <td
                          key={tranche.key}
                          className={`px-3 py-3 text-right ${headingAmountClass ?? ''}`}
                          title={allocation?.allocation_date ? `วันที่จัดสรร ${allocation.allocation_date}` : undefined}
                        >
                          {isHeading ? (
                            formatBudgetAmount(trancheValue)
                          ) : (
                            <button type="button" onClick={(event) => openAllocationCellEdit(event, item, tranche)} className="inline-flex w-full items-center justify-end gap-1 rounded px-1 py-1 text-right transition hover:bg-amber-50 hover:text-amber-800 focus:outline-none focus:ring-2 focus:ring-amber-300" title={`${hasAllocationData ? 'แก้ไข' : 'เพิ่ม'} ${tranche.label}`}>
                              {!hasAllocationData ? <Plus className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /> : null}
                              {formatBudgetAmount(displayedAllocation)}
                            </button>
                          )}
                        </td>
                      );
                    })}
                    <td className={`px-4 py-3 text-right font-semibold ${headingAmountClass ?? 'text-slate-900'}`}>{formatBudgetAmount(netTotal)}</td>
                    <td className={`px-4 py-3 text-right ${headingAmountClass ?? ''}`}>{isHeading ? formatSignedBudgetAmount(itemAmount.central_transfer_in_amount || 0, '+') : <button type="button" onClick={(event) => openAmountCellEdit(event, item, 'centralTransferInAmount', 'ส่วนกลางกรมฯ รับโอน', item.amount.central_transfer_in_amount)} className="w-full rounded px-1 py-1 text-right transition hover:bg-cyan-50 hover:text-cyan-800 focus:outline-none focus:ring-2 focus:ring-cyan-300">{formatSignedBudgetAmount(item.amount.central_transfer_in_amount || 0, '+')}</button>}</td>
                    <td className={`px-4 py-3 text-right ${headingAmountClass ?? ''}`}>{isHeading ? formatSignedBudgetAmount(itemAmount.central_transfer_out_amount || 0, '-') : <button type="button" onClick={(event) => openAmountCellEdit(event, item, 'centralTransferOutAmount', 'ส่วนกลางกรมฯ โอนออก', item.amount.central_transfer_out_amount)} className="w-full rounded px-1 py-1 text-right transition hover:bg-cyan-50 hover:text-cyan-800 focus:outline-none focus:ring-2 focus:ring-cyan-300">{formatSignedBudgetAmount(item.amount.central_transfer_out_amount || 0, '-')}</button>}</td>
                    <td className={`px-4 py-3 text-right ${headingAmountClass ?? ''}`}>{isHeading ? formatSignedBudgetAmount(itemAmount.department_request_increase_amount || 0, '+') : <button type="button" onClick={(event) => openAmountCellEdit(event, item, 'departmentRequestIncreaseAmount', 'ภายในกรม ขอเพิ่ม', item.amount.department_request_increase_amount)} className="w-full rounded px-1 py-1 text-right transition hover:bg-blue-50 hover:text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-300">{formatSignedBudgetAmount(item.amount.department_request_increase_amount || 0, '+')}</button>}</td>
                    <td className={`px-4 py-3 text-right ${headingAmountClass ?? ''}`}>{isHeading ? formatSignedBudgetAmount(itemAmount.department_transfer_out_amount || 0, '-') : <button type="button" onClick={(event) => openAmountCellEdit(event, item, 'departmentTransferOutAmount', 'ภายในกรม โอนออก', item.amount.department_transfer_out_amount)} className="w-full rounded px-1 py-1 text-right transition hover:bg-blue-50 hover:text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-300">{formatSignedBudgetAmount(item.amount.department_transfer_out_amount || 0, '-')}</button>}</td>
                    <td className={`px-4 py-3 text-right ${headingAmountClass ?? ''}`}>{isHeading ? formatSignedBudgetAmount(itemAmount.division_transfer_in_amount || 0, '+') : <button type="button" onClick={(event) => openAmountCellEdit(event, item, 'divisionTransferInAmount', 'ภายในกอง รับโอน', item.amount.division_transfer_in_amount)} className="w-full rounded px-1 py-1 text-right transition hover:bg-orange-50 hover:text-orange-800 focus:outline-none focus:ring-2 focus:ring-orange-300">{formatSignedBudgetAmount(item.amount.division_transfer_in_amount || 0, '+')}</button>}</td>
                    <td className={`px-4 py-3 text-right ${headingAmountClass ?? ''}`}>{isHeading ? formatSignedBudgetAmount(itemAmount.division_transfer_out_amount || 0, '-') : <button type="button" onClick={(event) => openAmountCellEdit(event, item, 'divisionTransferOutAmount', 'ภายในกอง โอนออก', item.amount.division_transfer_out_amount)} className="w-full rounded px-1 py-1 text-right transition hover:bg-orange-50 hover:text-orange-800 focus:outline-none focus:ring-2 focus:ring-orange-300">{formatSignedBudgetAmount(item.amount.division_transfer_out_amount || 0, '-')}</button>}</td>
                    <td className={`px-4 py-3 text-right ${headingAmountClass ?? ''}`}>{isHeading ? formatBudgetAmount(itemAmount.committed_po_amount || 0) : <button type="button" onClick={(event) => openAmountCellEdit(event, item, 'committedPoAmount', 'ผูกพัน มี PO', item.amount.committed_po_amount)} className="w-full rounded px-1 py-1 text-right transition hover:bg-purple-50 hover:text-purple-800 focus:outline-none focus:ring-2 focus:ring-purple-300">{formatBudgetAmount(item.amount.committed_po_amount || 0)}</button>}</td>
                    <td className={`px-4 py-3 text-right ${headingAmountClass ?? ''}`}>{isHeading ? formatBudgetAmount(itemAmount.committed_without_po_amount || 0) : <button type="button" onClick={(event) => openAmountCellEdit(event, item, 'committedWithoutPoAmount', 'ผูกพัน ไม่มี PO', item.amount.committed_without_po_amount)} className="w-full rounded px-1 py-1 text-right transition hover:bg-purple-50 hover:text-purple-800 focus:outline-none focus:ring-2 focus:ring-purple-300">{formatBudgetAmount(item.amount.committed_without_po_amount || 0)}</button>}</td>
                    <td className={`px-4 py-3 text-right ${headingAmountClass ?? ''}`}>{formatBudgetAmount(itemAmount.committed_total_amount || 0)}</td>
                    <td className={`px-4 py-3 text-right ${headingAmountClass ?? ''}`}>{isHeading ? formatBudgetAmount(itemAmount.disbursed_general_amount || 0) : <button type="button" onClick={(event) => openAmountCellEdit(event, item, 'disbursedGeneralAmount', 'เบิกจ่ายทั่วไป', item.amount.disbursed_general_amount)} className="w-full rounded px-1 py-1 text-right transition hover:bg-emerald-50 hover:text-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-300">{formatBudgetAmount(item.amount.disbursed_general_amount || 0)}</button>}</td>
                    <td className={`px-4 py-3 text-right ${headingAmountClass ?? ''}`}>{isHeading ? formatBudgetAmount(itemAmount.disbursed_advance_amount || 0) : <button type="button" onClick={(event) => openAmountCellEdit(event, item, 'disbursedAdvanceAmount', 'เงินยืมราชการ', item.amount.disbursed_advance_amount)} className="w-full rounded px-1 py-1 text-right transition hover:bg-emerald-50 hover:text-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-300">{formatBudgetAmount(item.amount.disbursed_advance_amount || 0)}</button>}</td>
                    <td className={`px-4 py-3 text-right ${headingAmountClass ?? ''}`}>{formatBudgetAmount(itemAmount.disbursed_total_amount || 0)}</td>
                    <td className={`px-4 py-3 text-right font-semibold ${headingAmountClass ?? 'text-slate-900'}`}>{formatBudgetAmount(utilizationTotal)}</td>
                    <td className={`px-4 py-3 text-right ${headingAmountClass ? headingAmountClass : remainingAmount < 0 ? 'font-semibold text-red-700' : 'text-slate-900'}`}>
                      {formatBudgetAmount(remainingAmount)}
                    </td>
                    <td className={`px-4 py-3 text-right font-semibold ${isHeading ? headingAmountClass : 'text-teal-700'}`}>{`${formatBudgetAmount(disbursementRate)}%`}</td>
                    <td className={`px-4 py-3 text-right font-semibold ${isHeading ? headingAmountClass : 'text-sky-700'}`}>{`${formatBudgetAmount(utilizationRate)}%`}</td>
                    {canManage ? (
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <button type="button" onClick={(event) => { event.stopPropagation(); startEdit(item); }} className="rounded-md border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-50" aria-label="แก้ไขรายการ">
                            <Edit3 className="h-4 w-4" aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              if (getDirectChildCount(item.id) > 0) {
                                setError('ลบหัวข้อนี้ไม่ได้ เนื่องจากยังมีรายการอยู่ภายใต้หัวข้อนี้');
                                return;
                              }
                              setDeleteTarget(item);
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
              })}
            </tbody>
          </table>
        </div>
      </section>
      ) : null}

      {isFormulaAuditOpen ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-6" role="dialog" aria-modal="true" aria-labelledby="budget-formula-audit-title">
          <button type="button" className="absolute inset-0 bg-slate-950/55 backdrop-blur-sm" onClick={() => setIsFormulaAuditOpen(false)} aria-label="ปิดหน้าต่างตรวจสอบสูตร" />
          <div className="relative flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-md bg-white shadow-2xl">
            <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-4 py-3 sm:px-6">
              <div>
                <h2 id="budget-formula-audit-title" className="flex items-center gap-2 text-lg font-bold text-slate-950">
                  <Calculator className="h-5 w-5 text-sky-700" aria-hidden="true" />
                  ตรวจสอบสูตรและโครงสร้างงบประมาณ
                </h2>
                <p className="mt-1 text-xs text-slate-500">ตรวจค่าที่ตารางแสดงเทียบกับสูตร และตรวจลำดับประเภทหลัก โครงการใหญ่ โครงการย่อย และกิจกรรม</p>
              </div>
              <button type="button" onClick={() => setIsFormulaAuditOpen(false)} className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-slate-200 text-slate-600 transition hover:bg-slate-50" title="ปิด">
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50">
              <div className="border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
                <label className="block">
                  <span className="text-sm font-semibold text-slate-800">เลือกรายการที่ต้องการตรวจสอบ</span>
                  <select
                    value={formulaAuditItem?.id ?? ''}
                    onChange={(event) => setFormulaAuditItemId(event.target.value)}
                    className="mt-2 h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                  >
                    {formulaAuditItems.map((item) => (
                      <option key={item.id} value={item.id}>
                        {[item.sequence_label, item.item_name].filter(Boolean).join(' ')}
                      </option>
                    ))}
                  </select>
                </label>
                {formulaAuditItem ? (
                  <p className="mt-2 text-xs text-slate-500">
                    ระดับข้อมูล: {formulaAuditItem.row_type} · รายการที่มีข้อมูลลูกจะแสดงยอดรวมจากลำดับชั้นเดียวกับตาราง
                  </p>
                ) : null}
              </div>

              <div className="px-4 py-5 sm:px-6">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-base font-bold text-slate-950">ผลตรวจสูตรคำนวณ</h3>
                  <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${formulaAuditRows.every((row) => isFormulaValueEqual(row.expected, row.displayed)) ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                    {formulaAuditRows.every((row) => isFormulaValueEqual(row.expected, row.displayed)) ? <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> : <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />}
                    {formulaAuditRows.every((row) => isFormulaValueEqual(row.expected, row.displayed)) ? 'ตรงตามสูตรทุกช่อง' : 'พบค่าที่ควรตรวจสอบ'}
                  </span>
                </div>

                <div className="grid gap-3 lg:grid-cols-2">
                  {formulaAuditRows.map((row) => {
                    const isValid = isFormulaValueEqual(row.expected, row.displayed);
                    return (
                      <section key={row.key} className={`rounded-md border p-4 ${formulaAuditToneClasses[row.tone]}`}>
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h4 className="text-sm font-bold text-slate-950">{row.title}</h4>
                            <p className="mt-1 text-xs font-medium text-slate-700">{row.formula}</p>
                          </div>
                          <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ${isValid ? 'bg-white/80 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                            {isValid ? <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> : <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />}
                            {isValid ? 'ถูกต้อง' : 'ไม่ตรง'}
                          </span>
                        </div>
                        <p className="mt-3 break-words rounded-md bg-white/75 px-3 py-2 font-mono text-xs text-slate-700">{row.substitutedFormula}</p>
                        <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <p className="text-xs text-slate-500">ค่าที่ควรได้</p>
                            <p className="mt-1 font-bold text-slate-950">{formatBudgetAmount(row.expected)}{row.suffix ?? ' บาท'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500">ค่าที่ตารางแสดง</p>
                            <p className={`mt-1 font-bold ${isValid ? 'text-slate-950' : 'text-red-700'}`}>{formatBudgetAmount(row.displayed)}{row.suffix ?? ' บาท'}</p>
                          </div>
                        </div>
                      </section>
                    );
                  })}
                </div>

                <section className="mt-6 border-t border-slate-200 pt-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="text-base font-bold text-slate-950">ผลตรวจโครงสร้างโครงการ</h3>
                      <p className="mt-1 text-xs text-slate-500">ประเภทหลัก → โครงการใหญ่ → โครงการย่อย → กิจกรรม และวงเงินลูกต้องไม่เกินวงเงินแม่</p>
                    </div>
                    <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${hierarchyAuditIssues.length === 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'}`}>
                      {hierarchyAuditIssues.length === 0 ? <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> : <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />}
                      {hierarchyAuditIssues.length === 0 ? 'โครงสร้างถูกต้อง' : `พบ ${hierarchyAuditIssues.length} จุดที่ควรตรวจสอบ`}
                    </span>
                  </div>

                  {hierarchyAuditIssues.length === 0 ? (
                    <div className="mt-3 flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                      <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
                      รายการทั้งหมดเชื่อมโยงตามลำดับและไม่พบวงเงินรายการลูกเกินวงเงินรายการแม่
                    </div>
                  ) : (
                    <div className="mt-3 max-h-56 overflow-y-auto rounded-md border border-amber-200 bg-white">
                      {hierarchyAuditIssues.map((issue, index) => (
                        <button
                          key={`${issue.itemId}-${index}`}
                          type="button"
                          onClick={() => setFormulaAuditItemId(issue.itemId)}
                          className="flex w-full items-start gap-3 border-b border-amber-100 px-4 py-3 text-left transition last:border-b-0 hover:bg-amber-50"
                        >
                          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" aria-hidden="true" />
                          <span className="min-w-0">
                            <span className="block text-sm font-semibold text-slate-900">{issue.sequenceLabel} {issue.itemName}</span>
                            <span className="mt-1 block text-xs text-amber-800">{issue.message}</span>
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </section>
              </div>
            </div>

            <div className="flex shrink-0 justify-end border-t border-slate-200 bg-white px-4 py-3 sm:px-6">
              <button type="button" onClick={() => setIsFormulaAuditOpen(false)} className="rounded-md bg-slate-800 px-5 py-2 text-sm font-semibold text-white transition hover:bg-slate-900">ปิด</button>
            </div>
          </div>
        </div>
      ) : null}

      {cellEdit ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="budget-cell-edit-title">
          <button type="button" className="absolute inset-0 bg-slate-950/55 backdrop-blur-sm" onClick={closeCellEdit} aria-label="ปิดหน้าต่างแก้ไขตัวเลข" />
          <div className={`relative w-full max-w-lg overflow-hidden rounded-md bg-white shadow-2xl ${cellEditToneClasses[cellEdit.tone].border}`}>
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
              <div className="min-w-0">
                <h2 id="budget-cell-edit-title" className={`text-lg font-bold ${cellEditToneClasses[cellEdit.tone].heading}`}>
                  {cellEditHasRecordedData ? 'แก้ไข' : 'เพิ่ม'}{cellEdit.label}
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  {cellEdit.item.sequence_label ? `${cellEdit.item.sequence_label} ` : ''}{cellEdit.item.item_name}
                </p>
              </div>
              <button type="button" onClick={closeCellEdit} disabled={saving} className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-slate-200 text-slate-600 transition hover:bg-slate-50 disabled:opacity-50" title="ปิด">
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <div className="space-y-4 bg-slate-50 p-5">
              <label className="block">
                <span className="text-sm font-medium text-slate-700">จำนวนเงิน</span>
                <div className="relative mt-1">
                  {cellEdit.field && amountFieldDisplaySigns[cellEdit.field] ? (
                    <span className={`pointer-events-none absolute inset-y-0 left-3 flex items-center text-lg font-semibold ${cellEditToneClasses[cellEdit.tone].heading}`}>
                      {amountFieldDisplaySigns[cellEdit.field]}
                    </span>
                  ) : null}
                  <input
                    value={cellEdit.value}
                    onChange={(event) => setCellEdit((current) => current ? { ...current, value: event.target.value } : current)}
                    inputMode="decimal"
                    autoFocus
                    className={`h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-right text-base outline-none focus:ring-2 ${cellEdit.field && amountFieldDisplaySigns[cellEdit.field] ? 'pl-9' : ''} ${cellEditToneClasses[cellEdit.tone].input}`}
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
                    onChange={(event) => setCellEdit((current) => current ? { ...current, allocationDate: event.target.value } : current)}
                    className={`mt-1 h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:ring-2 ${cellEditToneClasses[cellEdit.tone].input}`}
                  />
                </label>
              ) : null}
              <label className="block">
                <span className="text-sm font-medium text-slate-700">
                  เลขที่หนังสือ <span className="text-xs font-normal text-slate-500"></span>
                </span>
                <input
                  value={cellEdit.documentNumber}
                  onChange={(event) => setCellEdit((current) => current ? { ...current, documentNumber: event.target.value } : current)}
                  maxLength={200}
                  className={`mt-1 h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:ring-2 ${cellEditToneClasses[cellEdit.tone].input}`}
                  placeholder="เช่น สธ 0434.3ว 259"
                />
              </label>
              <p className={`rounded-md border px-3 py-2 text-xs ${cellEditToneClasses[cellEdit.tone].note}`}>ระบบจะคำนวณยอดสุทธิ ผลรวม คงเหลือ และร้อยละใหม่หลังบันทึก</p>
              {cellEditError ? <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{cellEditError}</p> : null}
            </div>
            <div className="flex justify-end gap-3 border-t border-slate-200 px-5 py-4">
              <button type="button" onClick={closeCellEdit} disabled={saving} className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50">ยกเลิก</button>
              <button type="button" onClick={() => void saveCellEdit()} disabled={saving} className={`inline-flex items-center gap-2 rounded-md px-5 py-2 text-sm font-semibold text-white transition disabled:opacity-50 ${cellEditToneClasses[cellEdit.tone].button}`}>
                <Save className="h-4 w-4" aria-hidden="true" />
                {saving ? 'กำลังบันทึก...' : cellEditHasRecordedData ? 'บันทึกการแก้ไข' : 'เพิ่มข้อมูล'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {editModalItem ? (
        <div className="fixed inset-0 z-[65] flex items-center justify-center p-3 sm:p-6" role="dialog" aria-modal="true" aria-labelledby="budget-item-edit-title">
          <button type="button" className="absolute inset-0 bg-slate-950/55 backdrop-blur-sm" onClick={closeEditModal} aria-label="ปิดหน้าต่างแก้ไข" />
          <div className="relative flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-md bg-white shadow-2xl">
            <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-4 py-3 sm:px-6">
              <div className="min-w-0">
                <h2 id="budget-item-edit-title" className="text-lg font-bold text-slate-950">รายละเอียดรายการงบประมาณ</h2>
                <p className="mt-1 truncate text-sm text-slate-600">{editModalItem.sequence_label ? `${editModalItem.sequence_label} ` : ''}{editModalItem.item_name}</p>
              </div>
              <button type="button" onClick={closeEditModal} disabled={saving} className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-slate-200 text-slate-600 transition hover:bg-slate-50 disabled:opacity-50" title="ปิด">
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
                      {editModalParent ? ` · อยู่ภายใต้ ${editModalParent.sequence_label ?? ''} ${editModalParent.item_name}` : ' · ระดับหลัก'}
                    </p>
                  </div>
                  {editModalHasChildren ? (
                    <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-800">แสดงยอดรวมจากรายการย่อย</span>
                  ) : null}
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-medium text-slate-700">ลำดับรายการ</span>
                  <input value={editModalForm.sequenceLabel} onChange={(event) => setEditModalForm((current) => ({ ...current, sequenceLabel: event.target.value }))} disabled={!canManage} className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100 disabled:bg-slate-100 disabled:text-slate-600" />
                </label>
                <label className="block sm:col-span-2">
                  <span className="text-sm font-medium text-slate-700">ชื่อรายการงบประมาณ</span>
                  <input value={editModalForm.itemName} onChange={(event) => setEditModalForm((current) => ({ ...current, itemName: event.target.value }))} disabled={!canManage} className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100 disabled:bg-slate-100 disabled:text-slate-600" />
                </label>
                {editModalItem.row_type !== 'budget_category' ? (
                  <>
                    <label className="block">
                      <span className="text-sm font-medium text-slate-700">ผลผลิต</span>
                      <input value={editModalForm.outputLabel} onChange={(event) => setEditModalForm((current) => ({ ...current, outputLabel: event.target.value }))} disabled={!canManage} className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100 disabled:bg-slate-100 disabled:text-slate-600" />
                    </label>
                    <label className="block">
                      <span className="text-sm font-medium text-slate-700">ลำดับกิจกรรม</span>
                      <input value={editModalForm.activitySequenceLabel} onChange={(event) => setEditModalForm((current) => ({ ...current, activitySequenceLabel: event.target.value }))} disabled={!canManage} className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100 disabled:bg-slate-100 disabled:text-slate-600" />
                    </label>
                    <label className="block sm:col-span-2">
                      <span className="text-sm font-medium text-slate-700">ชื่อกิจกรรม</span>
                      <input value={editModalForm.activityLabel} onChange={(event) => setEditModalForm((current) => ({ ...current, activityLabel: event.target.value }))} disabled={!canManage} className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100 disabled:bg-slate-100 disabled:text-slate-600" />
                    </label>
                    <label className="block">
                      <span className="text-sm font-medium text-slate-700">วงเงินตามแผน</span>
                      <input value={editModalForm.plannedBudgetAmount} onChange={(event) => setEditModalForm((current) => ({ ...current, plannedBudgetAmount: event.target.value }))} disabled={!canManage || editModalHasChildren} className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-right text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100 disabled:bg-slate-100 disabled:text-slate-600" inputMode="decimal" />
                    </label>
                  </>
                ) : null}
                {editModalItem.source_sheet_name || editModalItem.source_row_number ? (
                  <div className="sm:col-span-2 text-xs text-slate-500">
                    แหล่งข้อมูล: {editModalItem.source_sheet_name ?? '-'} · แถว {editModalItem.source_row_number ?? '-'}
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
                        const displayValue = tranche.trancheNumber === 1
                          ? editModalAmount.allocation_tranche_1_amount
                          : tranche.trancheNumber === 2
                            ? editModalAmount.allocation_tranche_2_amount
                            : tranche.trancheNumber === 3
                              ? editModalAmount.allocation_tranche_3_amount
                              : getItemTrancheValue(editModalItem, tranche);
                        const allocation = editModalItem.allocations?.find((entry) => entry.tranche_id === tranche.key);
                        return (
                          <div key={tranche.key} className="h-full min-w-0">
                            {renderDetailAmount(
                              tranche.label,
                              displayValue,
                              'amber',
                              () => openAllocationCellEdit(null, editModalItem, tranche),
                              allocation?.allocation_date ? `วันที่จัดสรร ${allocation.allocation_date}` : undefined,
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
                        {renderDetailAmount('รับโอน (2)', editModalAmount.central_transfer_in_amount, 'cyan', () => openAmountCellEdit(null, editModalItem, 'centralTransferInAmount', 'ส่วนกลางกรมฯ รับโอน', editModalItem.amount.central_transfer_in_amount), undefined, getDocumentNumber(editModalItem, 'central_transfer_in'), '+')}
                        {renderDetailAmount('โอนออก (3)', editModalAmount.central_transfer_out_amount, 'cyan', () => openAmountCellEdit(null, editModalItem, 'centralTransferOutAmount', 'ส่วนกลางกรมฯ โอนออก', editModalItem.amount.central_transfer_out_amount), undefined, getDocumentNumber(editModalItem, 'central_transfer_out'), '-')}
                      </div>
                    </div>
                    <div className="border-t-4 border-blue-600 pt-3">
                      <h3 className="text-sm font-bold text-blue-900">ภายในกรม</h3>
                      <div className="mt-3 grid gap-3">
                        {renderDetailAmount('ขอเพิ่ม', editModalAmount.department_request_increase_amount, 'blue', () => openAmountCellEdit(null, editModalItem, 'departmentRequestIncreaseAmount', 'ภายในกรม ขอเพิ่ม', editModalItem.amount.department_request_increase_amount), undefined, getDocumentNumber(editModalItem, 'department_request_increase'), '+')}
                        {renderDetailAmount('โอนออก', editModalAmount.department_transfer_out_amount, 'blue', () => openAmountCellEdit(null, editModalItem, 'departmentTransferOutAmount', 'ภายในกรม โอนออก', editModalItem.amount.department_transfer_out_amount), undefined, getDocumentNumber(editModalItem, 'department_transfer_out'), '-')}
                      </div>
                    </div>
                    <div className="border-t-4 border-orange-500 pt-3">
                      <h3 className="text-sm font-bold text-orange-900">ภายในกอง</h3>
                      <div className="mt-3 grid gap-3">
                        {renderDetailAmount('รับโอน (2)', editModalAmount.division_transfer_in_amount, 'orange', () => openAmountCellEdit(null, editModalItem, 'divisionTransferInAmount', 'ภายในกอง รับโอน', editModalItem.amount.division_transfer_in_amount), undefined, getDocumentNumber(editModalItem, 'division_transfer_in'), '+')}
                        {renderDetailAmount('โอนออก (3)', editModalAmount.division_transfer_out_amount, 'orange', () => openAmountCellEdit(null, editModalItem, 'divisionTransferOutAmount', 'ภายในกอง โอนออก', editModalItem.amount.division_transfer_out_amount), undefined, getDocumentNumber(editModalItem, 'division_transfer_out'), '-')}
                      </div>
                    </div>
                  </section>

                  <section className="grid gap-5 border-t border-slate-200 pt-5 lg:grid-cols-2">
                    <div className="border-t-4 border-purple-600 pt-3">
                      <h3 className="text-sm font-bold text-purple-900">ผูกพัน</h3>
                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        {renderDetailAmount('มี PO (4)', editModalAmount.committed_po_amount, 'purple', () => openAmountCellEdit(null, editModalItem, 'committedPoAmount', 'ผูกพัน มี PO', editModalItem.amount.committed_po_amount), undefined, getDocumentNumber(editModalItem, 'committed_po'))}
                        {renderDetailAmount('ไม่มี PO (5)', editModalAmount.committed_without_po_amount, 'purple', () => openAmountCellEdit(null, editModalItem, 'committedWithoutPoAmount', 'ผูกพัน ไม่มี PO', editModalItem.amount.committed_without_po_amount), undefined, getDocumentNumber(editModalItem, 'committed_without_po'))}
                      </div>
                    </div>
                    <div className="border-t-4 border-emerald-600 pt-3">
                      <h3 className="text-sm font-bold text-emerald-900">เบิก-จ่าย</h3>
                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        {renderDetailAmount('เบิกจ่ายทั่วไป (7)', editModalAmount.disbursed_general_amount, 'emerald', () => openAmountCellEdit(null, editModalItem, 'disbursedGeneralAmount', 'เบิกจ่ายทั่วไป', editModalItem.amount.disbursed_general_amount), undefined, getDocumentNumber(editModalItem, 'disbursed_general'))}
                        {renderDetailAmount('เงินยืมราชการ (8)', editModalAmount.disbursed_advance_amount, 'emerald', () => openAmountCellEdit(null, editModalItem, 'disbursedAdvanceAmount', 'เงินยืมราชการ', editModalItem.amount.disbursed_advance_amount), undefined, getDocumentNumber(editModalItem, 'disbursed_advance'))}
                      </div>
                    </div>
                  </section>

                  <section className="border-t border-slate-300 pt-5">
                    <div className="mb-3">
                      <h3 className="text-base font-bold text-slate-950">ผลการคำนวณ</h3>
                      <p className="mt-1 text-xs text-slate-500">ข้อมูลส่วนนี้คำนวณจากรายการข้างต้นและไม่เปิดให้แก้ไขโดยตรง</p>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <div className="rounded-md border border-lime-300 bg-lime-50 p-3"><span className="text-xs text-lime-800">ยอดสุทธิหลังโอนเปลี่ยนแปลง (1)</span><strong className="mt-1 block text-right text-lime-950">{formatBudgetAmount(editModalAmount.net_budget_after_transfer_amount)} บาท</strong></div>
                      <div className="rounded-md border border-purple-200 bg-purple-50 p-3"><span className="text-xs text-purple-800">ผูกพันรวม (6)</span><strong className="mt-1 block text-right text-purple-950">{formatBudgetAmount(editModalAmount.committed_total_amount)} บาท</strong></div>
                      <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3"><span className="text-xs text-emerald-800">เบิกจ่ายรวม (9)</span><strong className="mt-1 block text-right text-emerald-950">{formatBudgetAmount(editModalAmount.disbursed_total_amount)} บาท</strong></div>
                      <div className="rounded-md border border-sky-200 bg-sky-50 p-3"><span className="text-xs text-sky-800">รวม (10)</span><strong className="mt-1 block text-right text-sky-950">{formatBudgetAmount(editModalAmount.utilization_total_amount)} บาท</strong></div>
                      <div className={`rounded-md border p-3 ${editModalAmount.remaining_amount < 0 ? 'border-red-300 bg-red-50' : 'border-slate-300 bg-white'}`}><span className="text-xs text-slate-600">คงเหลือ (11)</span><strong className={`mt-1 block text-right ${editModalAmount.remaining_amount < 0 ? 'text-red-700' : 'text-slate-950'}`}>{formatBudgetAmount(editModalAmount.remaining_amount)} บาท</strong></div>
                      <div className="rounded-md border border-teal-200 bg-teal-50 p-3"><span className="text-xs text-teal-800">ร้อยละเบิกจ่าย (12)</span><strong className="mt-1 block text-right text-teal-950">{formatBudgetAmount(editModalAmount.disbursement_rate ?? 0)}%</strong></div>
                      <div className="rounded-md border border-blue-200 bg-blue-50 p-3"><span className="text-xs text-blue-800">ร้อยละรวม PO</span><strong className="mt-1 block text-right text-blue-950">{formatBudgetAmount(editModalAmount.utilization_with_po_rate ?? 0)}%</strong></div>
                    </div>
                  </section>
                </>
              ) : null}
              </div>
              {editModalError ? <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{editModalError}</p> : null}
            <div className="flex shrink-0 justify-end gap-3 border-t border-slate-200 bg-white px-4 py-3 sm:px-6">
              <button type="button" onClick={closeEditModal} disabled={saving} className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50">ปิด</button>
              {canManage ? (
                <button type="button" onClick={() => void saveEditModal()} disabled={saving || !editModalForm.itemName.trim()} className="inline-flex items-center gap-2 rounded-md bg-sky-700 px-5 py-2 text-sm font-semibold text-white transition hover:bg-sky-800 disabled:opacity-50">
                  <Save className="h-4 w-4" aria-hidden="true" />
                  {saving ? 'กำลังบันทึก...' : 'บันทึกรายละเอียด'}
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {isCategoryManagerOpen ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-6" role="dialog" aria-modal="true" aria-labelledby="budget-category-manager-title">
          <button
            type="button"
            className="absolute inset-0 bg-slate-950/55 backdrop-blur-sm"
            onClick={() => {
              if (saving) return;
              setIsCategoryManagerOpen(false);
              setMainForm(emptyMainForm);
            }}
            aria-label="ปิดหน้าต่าง"
          />
          <div className="relative flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-md bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 sm:px-6">
              <div>
                <h2 id="budget-category-manager-title" className="text-lg font-bold text-slate-950">จัดการประเภทหลัก</h2>
                <p className="mt-1 text-xs text-slate-500">เพิ่ม แก้ไข หรือลบหัวข้อสำหรับจัดกลุ่มรายการงบประมาณ</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (saving) return;
                  setIsCategoryManagerOpen(false);
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
                      onChange={(event) => setMainForm((current) => ({ ...current, itemName: event.target.value }))}
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
                  <div className="px-4 py-8 text-center text-sm text-slate-500">ยังไม่มีประเภทหลัก</div>
                ) : mainBudgetItems.map((category, index) => {
                  const childCount = getCategoryChildCount(category.id);

                  return (
                    <div key={category.id} className="grid gap-3 border-b border-slate-100 px-3 py-3 last:border-b-0 sm:grid-cols-[3rem_minmax(0,1fr)_auto] sm:items-center">
                      <span className="text-center text-sm font-semibold text-slate-500">{index + 1}</span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">{category.item_name}</p>
                        <p className="mt-0.5 text-xs text-slate-500">{childCount} รายการงบประมาณ</p>
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
                              setError('ลบประเภทหลักไม่ได้ เนื่องจากยังมีรายการงบประมาณอยู่ภายใต้ประเภทนี้');
                              return;
                            }
                            setDeleteTarget(category);
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
                })}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {isTrancheManagerOpen ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-6" role="dialog" aria-modal="true" aria-labelledby="budget-tranche-manager-title">
          <button
            type="button"
            className="absolute inset-0 bg-slate-950/55 backdrop-blur-sm"
            onClick={() => {
              if (saving) return;
              setIsTrancheManagerOpen(false);
              setTrancheDrafts(trancheDefinitions);
              setTrancheForm(emptyTrancheForm);
            }}
            aria-label="ปิดหน้าต่าง"
          />
          <div className="relative flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-md bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 sm:px-6">
              <div>
                <h2 id="budget-tranche-manager-title" className="text-lg font-bold text-slate-950">จัดการงวดจัดสรร</h2>
                <p className="mt-1 text-xs text-slate-500">เพิ่ม แก้ไข หรือลบงวดสำหรับบันทึกยอดจัดสรรตามวันที่</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (saving) return;
                  setIsTrancheManagerOpen(false);
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
                      onChange={(event) => setTrancheForm((current) => ({ ...current, label: event.target.value }))}
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
                  <div className="px-4 py-8 text-center text-sm text-slate-500">ยังไม่มีงวดจัดสรร</div>
                ) : trancheDrafts.map((tranche, index) => {
                  const usageCount = getTrancheUsageCount(tranche.key);

                  return (
                    <div key={tranche.key} className="grid gap-3 border-b border-slate-100 px-3 py-3 last:border-b-0 sm:grid-cols-[3rem_minmax(0,1fr)_auto] sm:items-center">
                      <span className="text-center text-sm font-semibold text-slate-500">{index + 1}</span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">{tranche.label}</p>
                        <p className="mt-0.5 text-xs text-slate-500">{usageCount} รายการงบประมาณที่ใช้งานงวดนี้</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setTrancheForm({ key: tranche.key, label: tranche.label })}
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
                })}
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setTrancheDrafts(trancheDefinitions);
                    setTrancheForm(emptyTrancheForm);
                    setIsTrancheManagerOpen(false);
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
      ) : null}

      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="ยืนยันการลบรายการ"
        message={`ต้องการลบ ${deleteTarget?.item_name ?? ''} ใช่หรือไม่?`}
        confirmLabel="ลบรายการ"
        cancelLabel="ยกเลิก"
        isLoading={saving}
        variant="danger"
        zIndexClassName="z-[70]"
      />
    </div>
  );
}
