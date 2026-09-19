import type {
  AllocationForm,
  AmountDisplaySign,
  AmountReferenceDefinition,
  CellEditTone,
  CentralTransferForm,
  CommitmentForm,
  DepartmentTransferForm,
  DisbursementForm,
  DivisionTransferForm,
  EditableAmountField,
  FormulaAuditRow,
  ItemForm,
  TrancheDefinition,
  TrancheForm,
} from '../types/budgetItems.types';

export const formulaAuditToneClasses: Record<FormulaAuditRow['tone'], string> = {
  lime: 'border-lime-300 bg-lime-50',
  purple: 'border-purple-300 bg-purple-50',
  emerald: 'border-emerald-300 bg-emerald-50',
  sky: 'border-sky-300 bg-sky-50',
  slate: 'border-slate-300 bg-slate-50',
  teal: 'border-teal-300 bg-teal-50',
  blue: 'border-blue-300 bg-blue-50',
};

export const emptyMainForm: ItemForm = {
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

export const emptyChildForm: ItemForm = {
  ...emptyMainForm,
  rowType: 'line_item',
};

export const emptyMajorProjectForm: ItemForm = {
  ...emptyMainForm,
  rowType: 'major_project',
};

export const emptySubActivityForm: ItemForm = {
  ...emptyMainForm,
  rowType: 'sub_project',
};

export const initialAllocationForm: AllocationForm = {
  itemId: '',
  trancheKey: 'legacy-1',
  amount: '',
  allocationDate: '',
  documentNumber: '',
};

export const initialDisbursementForm: DisbursementForm = {
  itemId: '',
  disbursedGeneralAmount: '',
  disbursedGeneralDocumentNumber: '',
  disbursedAdvanceAmount: '',
  disbursedAdvanceDocumentNumber: '',
};

export const initialCentralTransferForm: CentralTransferForm = {
  itemId: '',
  centralTransferInAmount: '',
  centralTransferInDocumentNumber: '',
  centralTransferOutAmount: '',
  centralTransferOutDocumentNumber: '',
};

export const initialDepartmentTransferForm: DepartmentTransferForm = {
  itemId: '',
  departmentRequestIncreaseAmount: '',
  departmentRequestIncreaseDocumentNumber: '',
  departmentTransferOutAmount: '',
  departmentTransferOutDocumentNumber: '',
};

export const initialDivisionTransferForm: DivisionTransferForm = {
  itemId: '',
  divisionTransferInAmount: '',
  divisionTransferInDocumentNumber: '',
  divisionTransferOutAmount: '',
  divisionTransferOutDocumentNumber: '',
};

export const initialCommitmentForm: CommitmentForm = {
  itemId: '',
  committedPoAmount: '',
  committedPoDocumentNumber: '',
  committedWithoutPoAmount: '',
  committedWithoutPoDocumentNumber: '',
};

export const initialTrancheDefinitions: TrancheDefinition[] = [
  { key: 'legacy-1', trancheNumber: 1, label: 'จัดสรรงวด 1' },
  { key: 'legacy-2', trancheNumber: 2, label: 'จัดสรรงวด 2' },
  { key: 'legacy-3', trancheNumber: 3, label: 'จัดสรรงวด 3' },
];

export const emptyTrancheForm: TrancheForm = {
  key: null,
  label: '',
};

export const cellEditToneClasses: Record<
  CellEditTone,
  {
    border: string;
    heading: string;
    input: string;
    note: string;
    button: string;
  }
> = {
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

export const detailAmountToneClasses: Record<CellEditTone, string> = {
  amber: 'border-amber-200 bg-amber-50 text-amber-950 hover:bg-amber-100',
  cyan: 'border-cyan-200 bg-cyan-50 text-cyan-950 hover:bg-cyan-100',
  blue: 'border-blue-200 bg-blue-50 text-blue-950 hover:bg-blue-100',
  orange: 'border-orange-200 bg-orange-50 text-orange-950 hover:bg-orange-100',
  purple: 'border-purple-200 bg-purple-50 text-purple-950 hover:bg-purple-100',
  emerald: 'border-emerald-200 bg-emerald-50 text-emerald-950 hover:bg-emerald-100',
};

export const amountReferenceDefinitions: Record<EditableAmountField, AmountReferenceDefinition> = {
  centralTransferInAmount: { referenceKey: 'central_transfer_in', transactionType: 'central_transfer_in' },
  centralTransferOutAmount: { referenceKey: 'central_transfer_out', transactionType: 'central_transfer_out' },
  departmentRequestIncreaseAmount: {
    referenceKey: 'department_request_increase',
    transactionType: 'department_request_increase',
  },
  departmentTransferOutAmount: {
    referenceKey: 'department_transfer_out',
    transactionType: 'department_transfer_out',
  },
  divisionTransferInAmount: { referenceKey: 'division_transfer_in', transactionType: 'division_transfer_in' },
  divisionTransferOutAmount: { referenceKey: 'division_transfer_out', transactionType: 'division_transfer_out' },
  committedPoAmount: { referenceKey: 'committed_po', transactionType: 'committed_po' },
  committedWithoutPoAmount: { referenceKey: 'committed_without_po', transactionType: 'committed_without_po' },
  disbursedGeneralAmount: { referenceKey: 'disbursed_general', transactionType: 'disbursed_general' },
  disbursedAdvanceAmount: { referenceKey: 'disbursed_advance', transactionType: 'disbursed_advance' },
};

export const amountFieldDisplaySigns: Partial<Record<EditableAmountField, AmountDisplaySign>> = {
  centralTransferInAmount: '+',
  centralTransferOutAmount: '-',
  departmentRequestIncreaseAmount: '+',
  departmentTransferOutAmount: '-',
  divisionTransferInAmount: '+',
  divisionTransferOutAmount: '-',
};

