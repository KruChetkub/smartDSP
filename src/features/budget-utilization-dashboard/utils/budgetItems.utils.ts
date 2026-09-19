import type {
  AmountDisplaySign,
  CellEditTone,
  EditableAmountField,
  ItemForm,
  TrancheDefinition,
} from '../types/budgetItems.types';
import type {
  BudgetUtilizationItemInput,
  BudgetUtilizationItemWithAmount,
} from '../types/budgetUtilization.types';
import { formatBudgetAmount, toNumber } from './budgetUtilizationCalculations';

export function isFormulaValueEqual(left: number, right: number) {
  return Math.abs(left - right) < 0.01;
}

export function settleCommitmentsFromDisbursement(
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

export function getAmountFieldTone(field: EditableAmountField): CellEditTone {
  if (field.startsWith('central')) return 'cyan';
  if (field.startsWith('department')) return 'blue';
  if (field.startsWith('division')) return 'orange';
  if (field.startsWith('committed')) return 'purple';
  return 'emerald';
}

export function formatSignedBudgetAmount(value: number, sign: AmountDisplaySign) {
  return `${sign}${formatBudgetAmount(Math.abs(value))}`;
}

export function getBudgetItemSearchLabel(item: BudgetUtilizationItemWithAmount) {
  return `${item.sequence_label ? `${item.sequence_label} ` : ''}${item.item_name}`;
}

export function getDocumentNumber(item: BudgetUtilizationItemWithAmount, referenceKey: string) {
  return (
    item.transactionReferences?.find((reference) => reference.reference_key === referenceKey)?.document_number ?? ''
  );
}

export function getItemTrancheValue(item: BudgetUtilizationItemWithAmount, tranche: TrancheDefinition) {
  const allocation = item.allocations?.find((entry) => entry.tranche_id === tranche.key) ?? null;
  const legacyAmount =
    tranche.trancheNumber === 1
      ? item.amount.allocation_tranche_1_amount
      : tranche.trancheNumber === 2
        ? item.amount.allocation_tranche_2_amount
        : tranche.trancheNumber === 3
          ? item.amount.allocation_tranche_3_amount
          : 0;
  return allocation?.amount ?? legacyAmount;
}

export function formFromItem(item: BudgetUtilizationItemWithAmount): ItemForm {
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

export function toItemPayload(
  reportPeriodId: string,
  form: ItemForm,
  parentId: string | null,
  sequenceLabel: string,
): BudgetUtilizationItemInput {
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

