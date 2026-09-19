import type {
  BudgetUtilizationItemWithAmount,
  BudgetUtilizationRowType,
  BudgetUtilizationTransactionType,
} from './budgetUtilization.types';

export type ItemForm = {
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

export type AllocationTrancheKey = string;
export type ItemsPageTab = 'transactions' | 'items';

export type AllocationForm = {
  itemId: string;
  trancheKey: AllocationTrancheKey;
  amount: string;
  allocationDate: string;
  documentNumber: string;
};

export type DisbursementForm = {
  itemId: string;
  disbursedGeneralAmount: string;
  disbursedGeneralDocumentNumber: string;
  disbursedAdvanceAmount: string;
  disbursedAdvanceDocumentNumber: string;
};

export type CentralTransferForm = {
  itemId: string;
  centralTransferInAmount: string;
  centralTransferInDocumentNumber: string;
  centralTransferOutAmount: string;
  centralTransferOutDocumentNumber: string;
};

export type DepartmentTransferForm = {
  itemId: string;
  departmentRequestIncreaseAmount: string;
  departmentRequestIncreaseDocumentNumber: string;
  departmentTransferOutAmount: string;
  departmentTransferOutDocumentNumber: string;
};

export type DivisionTransferForm = {
  itemId: string;
  divisionTransferInAmount: string;
  divisionTransferInDocumentNumber: string;
  divisionTransferOutAmount: string;
  divisionTransferOutDocumentNumber: string;
};

export type CommitmentForm = {
  itemId: string;
  committedPoAmount: string;
  committedPoDocumentNumber: string;
  committedWithoutPoAmount: string;
  committedWithoutPoDocumentNumber: string;
};

export type EditableAmountField =
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

export type CellEditTone = 'amber' | 'cyan' | 'blue' | 'orange' | 'purple' | 'emerald';

export type TrancheDefinition = {
  key: AllocationTrancheKey;
  id?: string;
  trancheNumber: number;
  label: string;
};

export type CellEditState = {
  item: BudgetUtilizationItemWithAmount;
  label: string;
  value: string;
  field?: EditableAmountField;
  tranche?: TrancheDefinition;
  allocationDate: string;
  documentNumber: string;
  tone: CellEditTone;
};

export type AmountReferenceDefinition = {
  referenceKey: string;
  transactionType: BudgetUtilizationTransactionType;
};

export type AmountDisplaySign = '+' | '-';

export type TrancheForm = {
  key: AllocationTrancheKey | null;
  label: string;
};

export type FormulaAuditRow = {
  key: string;
  title: string;
  formula: string;
  substitutedFormula: string;
  expected: number;
  displayed: number;
  suffix?: string;
  tone: 'lime' | 'purple' | 'emerald' | 'sky' | 'slate' | 'teal' | 'blue';
};

export type HierarchyAuditIssue = {
  itemId: string;
  sequenceLabel: string;
  itemName: string;
  message: string;
};

