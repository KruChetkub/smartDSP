import { useMemo, useState } from 'react';
import type {
  AllocationForm,
  CentralTransferForm,
  CommitmentForm,
  DepartmentTransferForm,
  DisbursementForm,
  DivisionTransferForm,
  TrancheDefinition,
} from '../types/budgetItems.types';
import type {
  BudgetUtilizationDashboardSummary,
  BudgetUtilizationItemWithAmount,
} from '../types/budgetUtilization.types';
import {
  initialAllocationForm,
  initialCentralTransferForm,
  initialCommitmentForm,
  initialDepartmentTransferForm,
  initialDisbursementForm,
  initialDivisionTransferForm,
} from '../constants/budgetItems.constants';
import {
  formFromItem,
  getDocumentNumber,
  settleCommitmentsFromDisbursement,
  toItemPayload,
} from '../utils/budgetItems.utils';
import {
  formatBudgetAmount,
  normalizeAmount,
  toNumber,
} from '../utils/budgetUtilizationCalculations';
import {
  saveBudgetItemAllocation,
  updateBudgetItemAmounts,
} from '../services/budgetUtilization.service';
import { getSafeUserErrorMessage } from '../../../utils/errorHandling';

export function useBudgetTransactions(
  budgetLineItems: BudgetUtilizationItemWithAmount[],
  summary: BudgetUtilizationDashboardSummary | null,
  trancheDefinitions: TrancheDefinition[],
  rollupMap: Map<string, ReturnType<typeof normalizeAmount>>,
  ensureReportPeriodId: () => Promise<string>,
  loadData: (periodId?: string) => Promise<BudgetUtilizationDashboardSummary | null>,
  setError: (msg: string | null) => void,
) {
  const [allocationForm, setAllocationForm] = useState<AllocationForm>(initialAllocationForm);
  const [disbursementForm, setDisbursementForm] = useState<DisbursementForm>(initialDisbursementForm);
  const [centralTransferForm, setCentralTransferForm] = useState<CentralTransferForm>(initialCentralTransferForm);
  const [departmentTransferForm, setDepartmentTransferForm] = useState<DepartmentTransferForm>(initialDepartmentTransferForm);
  const [divisionTransferForm, setDivisionTransferForm] = useState<DivisionTransferForm>(initialDivisionTransferForm);
  const [commitmentForm, setCommitmentForm] = useState<CommitmentForm>(initialCommitmentForm);
  const [savingTransaction, setSavingTransaction] = useState(false);

  const selectedAllocationItem = useMemo(() => {
    return budgetLineItems.find((item) => item.id === allocationForm.itemId) ?? null;
  }, [allocationForm.itemId, budgetLineItems]);

  const selectedDisbursementItem = useMemo(() => {
    return budgetLineItems.find((item) => item.id === disbursementForm.itemId) ?? null;
  }, [budgetLineItems, disbursementForm.itemId]);

  const selectedDisbursementAmount = useMemo(() => {
    if (!selectedDisbursementItem) return null;
    return (
      rollupMap.get(selectedDisbursementItem.id) ?? normalizeAmount(selectedDisbursementItem.amount)
    );
  }, [rollupMap, selectedDisbursementItem]);

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

  const applySelectedAllocationItemValue = (
    item: BudgetUtilizationItemWithAmount | null,
    trancheKey = allocationForm.trancheKey,
  ) => {
    if (!item) {
      setAllocationForm((current) => ({
        ...current,
        amount: '',
        allocationDate: '',
        documentNumber: '',
      }));
      return;
    }

    const allocation = item.allocations?.find((entry) => entry.tranche_id === trancheKey) ?? null;
    const definition = trancheDefinitions.find((tranche) => tranche.key === trancheKey) ?? null;
    const legacyAmount =
      definition?.trancheNumber === 1
        ? item.amount.allocation_tranche_1_amount
        : definition?.trancheNumber === 2
          ? item.amount.allocation_tranche_2_amount
          : definition?.trancheNumber === 3
            ? item.amount.allocation_tranche_3_amount
            : 0;
    const legacyDate =
      definition?.trancheNumber === 1
        ? item.amount.allocation_tranche_1_date
        : definition?.trancheNumber === 2
          ? item.amount.allocation_tranche_2_date
          : definition?.trancheNumber === 3
            ? item.amount.allocation_tranche_3_date
            : null;

    setAllocationForm((current) => ({
      ...current,
      amount: String(allocation?.amount || legacyAmount || ''),
      allocationDate: allocation?.allocation_date ?? legacyDate ?? '',
      documentNumber: getDocumentNumber(item, `allocation:${trancheKey}`),
    }));
  };

  const applySelectedDisbursementItemValue = (
    item: BudgetUtilizationItemWithAmount | null,
  ) => {
    setDisbursementForm((current) => ({
      ...current,
      disbursedGeneralAmount: item ? String(item.amount.disbursed_general_amount || '') : '',
      disbursedGeneralDocumentNumber: item ? getDocumentNumber(item, 'disbursed_general') : '',
      disbursedAdvanceAmount: item ? String(item.amount.disbursed_advance_amount || '') : '',
      disbursedAdvanceDocumentNumber: item ? getDocumentNumber(item, 'disbursed_advance') : '',
    }));
  };

  const applySelectedCentralTransferItemValue = (
    item: BudgetUtilizationItemWithAmount | null,
  ) => {
    setCentralTransferForm((current) => ({
      ...current,
      centralTransferInAmount: item ? String(item.amount.central_transfer_in_amount || '') : '',
      centralTransferInDocumentNumber: item ? getDocumentNumber(item, 'central_transfer_in') : '',
      centralTransferOutAmount: item ? String(item.amount.central_transfer_out_amount || '') : '',
      centralTransferOutDocumentNumber: item ? getDocumentNumber(item, 'central_transfer_out') : '',
    }));
  };

  const applySelectedDepartmentTransferItemValue = (
    item: BudgetUtilizationItemWithAmount | null,
  ) => {
    setDepartmentTransferForm((current) => ({
      ...current,
      departmentRequestIncreaseAmount: item
        ? String(item.amount.department_request_increase_amount || '')
        : '',
      departmentRequestIncreaseDocumentNumber: item
        ? getDocumentNumber(item, 'department_request_increase')
        : '',
      departmentTransferOutAmount: item
        ? String(item.amount.department_transfer_out_amount || '')
        : '',
      departmentTransferOutDocumentNumber: item
        ? getDocumentNumber(item, 'department_transfer_out')
        : '',
    }));
  };

  const applySelectedDivisionTransferItemValue = (
    item: BudgetUtilizationItemWithAmount | null,
  ) => {
    setDivisionTransferForm((current) => ({
      ...current,
      divisionTransferInAmount: item ? String(item.amount.division_transfer_in_amount || '') : '',
      divisionTransferInDocumentNumber: item ? getDocumentNumber(item, 'division_transfer_in') : '',
      divisionTransferOutAmount: item ? String(item.amount.division_transfer_out_amount || '') : '',
      divisionTransferOutDocumentNumber: item ? getDocumentNumber(item, 'division_transfer_out') : '',
    }));
  };

  const applySelectedCommitmentItemValue = (
    item: BudgetUtilizationItemWithAmount | null,
  ) => {
    setCommitmentForm((current) => ({
      ...current,
      committedPoAmount: item ? String(item.amount.committed_po_amount || '') : '',
      committedPoDocumentNumber: item ? getDocumentNumber(item, 'committed_po') : '',
      committedWithoutPoAmount: item ? String(item.amount.committed_without_po_amount || '') : '',
      committedWithoutPoDocumentNumber: item
        ? getDocumentNumber(item, 'committed_without_po')
        : '',
    }));
  };

  const saveAllocationForm = async () => {
    if (!selectedAllocationItem) {
      setError('กรุณาเลือกรายการงบประมาณก่อนบันทึกจัดสรรงวด');
      return;
    }

    try {
      setSavingTransaction(true);
      setError(null);
      const activeReportPeriodId = await ensureReportPeriodId();
      const selectedTranche = summary?.allocationTranches.find(
        (tranche) => tranche.id === allocationForm.trancheKey,
      );
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
      const refreshedItem =
        refreshedSummary?.items.find((item) => item.id === selectedAllocationItem.id) ?? null;
      if (refreshedItem) {
        applySelectedAllocationItemValue(refreshedItem, allocationForm.trancheKey);
      }
    } catch (saveError) {
      setError(getSafeUserErrorMessage(saveError, 'ไม่สามารถบันทึกจัดสรรงวดได้'));
    } finally {
      setSavingTransaction(false);
    }
  };

  const saveDisbursementForm = async () => {
    if (!selectedDisbursementItem) {
      setError('กรุณาเลือกรายการงบประมาณก่อนบันทึกเบิก-จ่าย');
      return;
    }

    try {
      setSavingTransaction(true);
      setError(null);
      const activeReportPeriodId = await ensureReportPeriodId();
      const nextForm = formFromItem(selectedDisbursementItem);
      const disbursedGeneral = toNumber(disbursementForm.disbursedGeneralAmount);
      const disbursedAdvance = toNumber(disbursementForm.disbursedAdvanceAmount);
      const disbursedTotal = disbursedGeneral + disbursedAdvance;
      const previousDisbursedTotal =
        selectedDisbursementItem.amount.disbursed_general_amount +
        selectedDisbursementItem.amount.disbursed_advance_amount;
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
        toItemPayload(
          activeReportPeriodId,
          nextForm,
          selectedDisbursementItem.parent_id,
          selectedDisbursementItem.sequence_label ?? '',
        ),
        [
          {
            referenceKey: 'disbursed_general',
            transactionType: 'disbursed_general',
            documentNumber: disbursementForm.disbursedGeneralDocumentNumber,
            amount: disbursedGeneral,
          },
          {
            referenceKey: 'disbursed_advance',
            transactionType: 'disbursed_advance',
            documentNumber: disbursementForm.disbursedAdvanceDocumentNumber,
            amount: disbursedAdvance,
          },
        ],
      );
      await loadData(activeReportPeriodId);
    } catch (saveError) {
      setError(getSafeUserErrorMessage(saveError, 'ไม่สามารถบันทึกเบิก-จ่ายได้'));
    } finally {
      setSavingTransaction(false);
    }
  };

  const saveCentralTransferForm = async () => {
    if (!selectedCentralTransferItem) {
      setError('กรุณาเลือกรายการงบประมาณก่อนบันทึกส่วนกลางกรมฯ');
      return;
    }

    try {
      setSavingTransaction(true);
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
      const utilizationTotal =
        toNumber(nextForm.committedTotalAmount) + toNumber(nextForm.disbursedTotalAmount);
      const remainingAmount = effectiveBudget - utilizationTotal;

      nextForm.centralTransferInAmount = centralTransferForm.centralTransferInAmount;
      nextForm.centralTransferOutAmount = centralTransferForm.centralTransferOutAmount;
      nextForm.netBudgetAfterTransferAmount = String(effectiveBudget || '');
      nextForm.utilizationTotalAmount = String(utilizationTotal || '');
      nextForm.remainingAmount = String(remainingAmount || '');

      await updateBudgetItemAmounts(
        toItemPayload(
          activeReportPeriodId,
          nextForm,
          selectedCentralTransferItem.parent_id,
          selectedCentralTransferItem.sequence_label ?? '',
        ),
        [
          {
            referenceKey: 'central_transfer_in',
            transactionType: 'central_transfer_in',
            documentNumber: centralTransferForm.centralTransferInDocumentNumber,
            amount: centralTransferIn,
          },
          {
            referenceKey: 'central_transfer_out',
            transactionType: 'central_transfer_out',
            documentNumber: centralTransferForm.centralTransferOutDocumentNumber,
            amount: centralTransferOut,
          },
        ],
      );
      await loadData(activeReportPeriodId);
    } catch (saveError) {
      setError(getSafeUserErrorMessage(saveError, 'ไม่สามารถบันทึกส่วนกลางกรมฯ ได้'));
    } finally {
      setSavingTransaction(false);
    }
  };

  const saveDivisionTransferForm = async () => {
    if (!selectedDivisionTransferItem) {
      setError('กรุณาเลือกรายการงบประมาณก่อนบันทึกภายในกอง');
      return;
    }

    try {
      setSavingTransaction(true);
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
        toItemPayload(
          activeReportPeriodId,
          nextForm,
          selectedDivisionTransferItem.parent_id,
          selectedDivisionTransferItem.sequence_label ?? '',
        ),
        [
          {
            referenceKey: 'division_transfer_in',
            transactionType: 'division_transfer_in',
            documentNumber: divisionTransferForm.divisionTransferInDocumentNumber,
            amount: divisionTransferIn,
          },
          {
            referenceKey: 'division_transfer_out',
            transactionType: 'division_transfer_out',
            documentNumber: divisionTransferForm.divisionTransferOutDocumentNumber,
            amount: divisionTransferOut,
          },
        ],
      );
      await loadData(activeReportPeriodId);
    } catch (saveError) {
      setError(getSafeUserErrorMessage(saveError, 'ไม่สามารถบันทึกภายในกองได้'));
    } finally {
      setSavingTransaction(false);
    }
  };

  const saveDepartmentTransferForm = async () => {
    if (!selectedDepartmentTransferItem) {
      setError('กรุณาเลือกรายการงบประมาณก่อนบันทึกภายในกรม');
      return;
    }

    try {
      setSavingTransaction(true);
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

      nextForm.departmentRequestIncreaseAmount =
        departmentTransferForm.departmentRequestIncreaseAmount;
      nextForm.departmentTransferOutAmount = departmentTransferForm.departmentTransferOutAmount;
      nextForm.netBudgetAfterTransferAmount = String(effectiveBudget || '');
      nextForm.remainingAmount = String(remainingAmount || '');

      await updateBudgetItemAmounts(
        toItemPayload(
          activeReportPeriodId,
          nextForm,
          selectedDepartmentTransferItem.parent_id,
          selectedDepartmentTransferItem.sequence_label ?? '',
        ),
        [
          {
            referenceKey: 'department_request_increase',
            transactionType: 'department_request_increase',
            documentNumber: departmentTransferForm.departmentRequestIncreaseDocumentNumber,
            amount: requestIncrease,
          },
          {
            referenceKey: 'department_transfer_out',
            transactionType: 'department_transfer_out',
            documentNumber: departmentTransferForm.departmentTransferOutDocumentNumber,
            amount: transferOut,
          },
        ],
      );
      await loadData(activeReportPeriodId);
    } catch (saveError) {
      setError(getSafeUserErrorMessage(saveError, 'ไม่สามารถบันทึกภายในกรมได้'));
    } finally {
      setSavingTransaction(false);
    }
  };

  const saveCommitmentForm = async () => {
    if (!selectedCommitmentItem) {
      setError('กรุณาเลือกรายการงบประมาณก่อนบันทึกผูกพัน');
      return;
    }

    try {
      setSavingTransaction(true);
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
        throw new Error(
          `ยอดผูกพันคงค้างต้องไม่เกินวงเงินที่ยังไม่เบิกจ่าย ${formatBudgetAmount(availableForCommitment)} บาท`,
        );
      }
      const remainingAmount = effectiveBudget - utilizationTotal;

      nextForm.committedPoAmount = commitmentForm.committedPoAmount;
      nextForm.committedWithoutPoAmount = commitmentForm.committedWithoutPoAmount;
      nextForm.committedTotalAmount = String(committedTotal || '');
      nextForm.utilizationTotalAmount = String(utilizationTotal || '');
      nextForm.remainingAmount = String(remainingAmount || '');

      await updateBudgetItemAmounts(
        toItemPayload(
          activeReportPeriodId,
          nextForm,
          selectedCommitmentItem.parent_id,
          selectedCommitmentItem.sequence_label ?? '',
        ),
        [
          {
            referenceKey: 'committed_po',
            transactionType: 'committed_po',
            documentNumber: commitmentForm.committedPoDocumentNumber,
            amount: committedPo,
          },
          {
            referenceKey: 'committed_without_po',
            transactionType: 'committed_without_po',
            documentNumber: commitmentForm.committedWithoutPoDocumentNumber,
            amount: committedWithoutPo,
          },
        ],
      );
      await loadData(activeReportPeriodId);
    } catch (saveError) {
      setError(getSafeUserErrorMessage(saveError, 'ไม่สามารถบันทึกผูกพันได้'));
    } finally {
      setSavingTransaction(false);
    }
  };

  return {
    allocationForm,
    setAllocationForm,
    disbursementForm,
    setDisbursementForm,
    centralTransferForm,
    setCentralTransferForm,
    departmentTransferForm,
    setDepartmentTransferForm,
    divisionTransferForm,
    setDivisionTransferForm,
    commitmentForm,
    setCommitmentForm,
    savingTransaction,
    selectedAllocationItem,
    selectedDisbursementItem,
    selectedDisbursementAmount,
    selectedCentralTransferItem,
    selectedDepartmentTransferItem,
    selectedDivisionTransferItem,
    selectedCommitmentItem,
    applySelectedAllocationItemValue,
    applySelectedDisbursementItemValue,
    applySelectedCentralTransferItemValue,
    applySelectedDepartmentTransferItemValue,
    applySelectedDivisionTransferItemValue,
    applySelectedCommitmentItemValue,
    saveAllocationForm,
    saveDisbursementForm,
    saveCentralTransferForm,
    saveDivisionTransferForm,
    saveDepartmentTransferForm,
    saveCommitmentForm,
  };
}

