import { useState, type MouseEvent } from 'react';
import type {
  BudgetUtilizationDashboardSummary,
  BudgetUtilizationItemWithAmount,
  BudgetUtilizationRowType,
} from '../types/budgetUtilization.types';
import type {
  CellEditState,
  EditableAmountField,
  ItemForm,
  TrancheDefinition,
} from '../types/budgetItems.types';
import {
  amountReferenceDefinitions,
  emptyChildForm,
  emptyMainForm,
  emptyMajorProjectForm,
  emptySubActivityForm,
} from '../constants/budgetItems.constants';
import {
  formFromItem,
  getAmountFieldTone,
  getBudgetItemSearchLabel,
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
  createBudgetItem,
  deleteBudgetItem,
  saveBudgetItemAllocation,
  updateBudgetItem,
  updateBudgetItemAmounts,
  updateBudgetItemDetails,
} from '../services/budgetUtilization.service';
import { getSafeUserErrorMessage } from '../../../utils/errorHandling';

interface HierarchyStateHelpers {
  mainBudgetItems: BudgetUtilizationItemWithAmount[];
  allBudgetItems: BudgetUtilizationItemWithAmount[];
  selectedMainCategory: BudgetUtilizationItemWithAmount | null;
  selectedMajorProject: BudgetUtilizationItemWithAmount | null;
  selectedMajorProjectSubActivities: BudgetUtilizationItemWithAmount[];
  selectedSubActivity: BudgetUtilizationItemWithAmount | null;
  availableBudgetParents: BudgetUtilizationItemWithAmount[];
  rollupMap: Map<string, ReturnType<typeof normalizeAmount>>;
  getMainSequenceLabel: (itemId: string | null) => string;
  getChildSequenceLabel: (parent: BudgetUtilizationItemWithAmount, itemId: string | null) => string;
  getDirectChildCount: (itemId: string) => number;
  getDescendantItems: (itemId: string) => BudgetUtilizationItemWithAmount[];
}

export function useBudgetHierarchyMutations(
  helpers: HierarchyStateHelpers,
  summary: BudgetUtilizationDashboardSummary | null,
  ensureReportPeriodId: () => Promise<string>,
  loadData: (periodId?: string) => Promise<BudgetUtilizationDashboardSummary | null>,
  setError: (msg: string | null) => void,
  onAfterItemModified?: (refreshedItem: BudgetUtilizationItemWithAmount | null) => void,
  onAfterItemDeleted?: (deletedItemId: string) => void,
) {
  const [mainForm, setMainForm] = useState<ItemForm>(emptyMainForm);
  const [majorProjectForm, setMajorProjectForm] = useState<ItemForm>(emptyMajorProjectForm);
  const [subActivityForm, setSubActivityForm] = useState<ItemForm>(emptySubActivityForm);
  const [childForm, setChildForm] = useState<ItemForm>(emptyChildForm);
  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false);
  const [editModalItem, setEditModalItem] = useState<BudgetUtilizationItemWithAmount | null>(null);
  const [editModalForm, setEditModalForm] = useState<ItemForm>(emptyMainForm);
  const [editModalError, setEditModalError] = useState<string | null>(null);
  const [cellEdit, setCellEdit] = useState<CellEditState | null>(null);
  const [cellEditError, setCellEditError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BudgetUtilizationItemWithAmount | null>(null);
  const [savingMutation, setSavingMutation] = useState(false);

  const startEdit = (item: BudgetUtilizationItemWithAmount) => {
    setEditModalItem(item);
    setEditModalForm(formFromItem(item));
    setEditModalError(null);
  };

  const closeEditModal = () => {
    if (savingMutation) return;
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
      setSavingMutation(true);
      setEditModalError(null);
      const editedItemId = editModalItem.id;
      const activeReportPeriodId = await ensureReportPeriodId();
      await updateBudgetItemDetails(
        toItemPayload(
          activeReportPeriodId,
          editModalForm,
          editModalItem.parent_id,
          editModalForm.sequenceLabel || editModalItem.sequence_label || '',
        ),
      );
      setEditModalItem(null);
      setEditModalForm(emptyMainForm);
      const refreshedSummary = await loadData(activeReportPeriodId);
      const refreshedItem =
        refreshedSummary?.items.find((item) => item.id === editedItemId) ?? null;
      onAfterItemModified?.(refreshedItem);
    } catch (saveError) {
      setEditModalError(getSafeUserErrorMessage(saveError, 'ไม่สามารถบันทึกการแก้ไขรายการได้'));
    } finally {
      setSavingMutation(false);
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
    const legacyAmount =
      tranche.trancheNumber === 1
        ? item.amount.allocation_tranche_1_amount
        : tranche.trancheNumber === 2
          ? item.amount.allocation_tranche_2_amount
          : tranche.trancheNumber === 3
            ? item.amount.allocation_tranche_3_amount
            : 0;
    const legacyDate =
      tranche.trancheNumber === 1
        ? item.amount.allocation_tranche_1_date
        : tranche.trancheNumber === 2
          ? item.amount.allocation_tranche_2_date
          : tranche.trancheNumber === 3
            ? item.amount.allocation_tranche_3_date
            : null;

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
    if (savingMutation) return;
    setCellEdit(null);
    setCellEditError(null);
  };

  const saveCellEdit = async () => {
    if (!cellEdit) return;

    try {
      setSavingMutation(true);
      setCellEditError(null);
      const activeReportPeriodId = await ensureReportPeriodId();

      if (cellEdit.tranche) {
        const selectedTranche = summary?.allocationTranches.find(
          (tranche) => tranche.id === cellEdit.tranche?.key,
        );
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
        if (
          cellEdit.field === 'disbursedGeneralAmount' ||
          cellEdit.field === 'disbursedAdvanceAmount'
        ) {
          const previousDisbursedTotal =
            cellEdit.item.amount.disbursed_general_amount +
            cellEdit.item.amount.disbursed_advance_amount;
          const nextDisbursedTotal =
            toNumber(nextForm.disbursedGeneralAmount) + toNumber(nextForm.disbursedAdvanceAmount);
          settleCommitmentsFromDisbursement(nextForm, previousDisbursedTotal, nextDisbursedTotal);
        }
        if (
          cellEdit.field === 'committedPoAmount' ||
          cellEdit.field === 'committedWithoutPoAmount'
        ) {
          const committedTotal =
            toNumber(nextForm.committedPoAmount) + toNumber(nextForm.committedWithoutPoAmount);
          const availableForCommitment = Math.max(
            0,
            toNumber(nextForm.netBudgetAfterTransferAmount) -
              toNumber(nextForm.disbursedGeneralAmount) -
              toNumber(nextForm.disbursedAdvanceAmount),
          );
          if (committedTotal - availableForCommitment > 0.01) {
            throw new Error(
              `ยอดผูกพันคงค้างต้องไม่เกินวงเงินที่ยังไม่เบิกจ่าย ${formatBudgetAmount(availableForCommitment)} บาท`,
            );
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
          [
            {
              ...referenceDefinition,
              documentNumber: cellEdit.documentNumber,
              amount: toNumber(cellEdit.value),
            },
          ],
        );
      }

      setCellEdit(null);
      const refreshedSummary = await loadData(activeReportPeriodId);
      if (refreshedSummary) {
        const refreshedItem =
          refreshedSummary.items.find((item) => item.id === cellEdit.item.id) ?? null;
        if (refreshedItem) {
          if (editModalItem?.id === refreshedItem.id) setEditModalItem(refreshedItem);
          onAfterItemModified?.(refreshedItem);
        }
      }
    } catch (saveError) {
      setCellEditError(getSafeUserErrorMessage(saveError, 'ไม่สามารถบันทึกตัวเลขรายการได้'));
    } finally {
      setSavingMutation(false);
    }
  };

  const saveMainForm = async () => {
    try {
      setSavingMutation(true);
      setError(null);
      const activeReportPeriodId = await ensureReportPeriodId();
      const payload = toItemPayload(
        activeReportPeriodId,
        { ...mainForm, plannedBudgetAmount: '', outputLabel: '', activityLabel: '' },
        null,
        helpers.getMainSequenceLabel(mainForm.itemId),
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
      setSavingMutation(false);
    }
  };

  const saveMajorProjectForm = async (
    setSelectedMajorProjectId: (id: string) => void,
    setSelectedSubActivityId: (id: string) => void,
  ) => {
    const categoryId = majorProjectForm.parentId || helpers.selectedMainCategory?.id || '';
    if (!categoryId) {
      setError('กรุณาเลือกประเภทหลักงบดำเนินงานก่อนสร้างโครงการใหญ่');
      return;
    }

    const category = helpers.mainBudgetItems.find((item) => item.id === categoryId);
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
      ? helpers.allBudgetItems
          .filter(
            (item) =>
              item.parent_id === majorProjectForm.itemId && item.row_type === 'sub_project',
          )
          .reduce((sum, item) => sum + item.amount.planned_budget_amount, 0)
      : 0;
    if (majorProjectBudget < existingSubProjectTotal) {
      setError(
        `วงเงินโครงการใหญ่ต้องไม่น้อยกว่ายอดรวมกิจกรรมย่อย ${formatBudgetAmount(existingSubProjectTotal)} บาท`,
      );
      return;
    }

    try {
      setSavingMutation(true);
      setError(null);
      const activeReportPeriodId = await ensureReportPeriodId();
      const payload = toItemPayload(
        activeReportPeriodId,
        { ...majorProjectForm, rowType: 'major_project' },
        category.id,
        helpers.getChildSequenceLabel(category, majorProjectForm.itemId),
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
      setSavingMutation(false);
    }
  };

  const saveSubActivityForm = async (
    setSelectedSubActivityId: (id: string) => void,
  ) => {
    if (!helpers.selectedMajorProject) {
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

    const otherSubActivityTotal = helpers.selectedMajorProjectSubActivities
      .filter((item) => item.id !== subActivityForm.itemId)
      .reduce((sum, item) => sum + item.amount.planned_budget_amount, 0);
    if (
      otherSubActivityTotal + subActivityBudget >
      helpers.selectedMajorProject.amount.planned_budget_amount
    ) {
      setError(
        `วงเงินรวมของกิจกรรมย่อยต้องไม่เกินวงเงินโครงการใหญ่ ${formatBudgetAmount(helpers.selectedMajorProject.amount.planned_budget_amount)} บาท`,
      );
      return;
    }

    const existingActivityTotal = subActivityForm.itemId
      ? helpers.getDescendantItems(subActivityForm.itemId)
          .filter((item) => item.row_type === 'activity' || item.row_type === 'line_item')
          .reduce((sum, item) => sum + item.amount.planned_budget_amount, 0)
      : 0;
    if (subActivityBudget < existingActivityTotal) {
      setError(
        `วงเงินกิจกรรมย่อยต้องไม่น้อยกว่ายอดรวมกิจกรรม ${formatBudgetAmount(existingActivityTotal)} บาท`,
      );
      return;
    }

    try {
      setSavingMutation(true);
      setError(null);
      const activeReportPeriodId = await ensureReportPeriodId();
      const payload = toItemPayload(
        activeReportPeriodId,
        { ...subActivityForm, parentId: helpers.selectedMajorProject.id, rowType: 'sub_project' },
        helpers.selectedMajorProject.id,
        helpers.getChildSequenceLabel(helpers.selectedMajorProject, subActivityForm.itemId),
      );
      const savedSubActivity = subActivityForm.itemId
        ? await updateBudgetItem(payload)
        : await createBudgetItem(payload);

      setSubActivityForm({ ...emptySubActivityForm, parentId: helpers.selectedMajorProject.id });
      setSelectedSubActivityId(savedSubActivity.id);
      setChildForm({ ...emptyChildForm, parentId: savedSubActivity.id, rowType: 'activity' });
      await loadData(activeReportPeriodId);
    } catch (saveError) {
      setError(getSafeUserErrorMessage(saveError, 'ไม่สามารถบันทึกกิจกรรมย่อยได้'));
    } finally {
      setSavingMutation(false);
    }
  };

  const saveChildForm = async (
    selectedSubActivityId: string,
    selectedCategoryId: string,
  ) => {
    if (!childForm.parentId) {
      setError('กรุณาเลือกประเภทหลักก่อนสร้างรายการงบประมาณ');
      return;
    }

    try {
      setSavingMutation(true);
      setError(null);
      const activeReportPeriodId = await ensureReportPeriodId();
      const parentItem = helpers.availableBudgetParents.find((item) => item.id === childForm.parentId);
      if (!parentItem) {
        setError('ไม่พบประเภทหลักหรือโครงการใหญ่ที่เลือก');
        return;
      }

      if (parentItem.row_type === 'sub_project') {
        const majorProject =
          helpers.allBudgetItems.find((item) => item.id === parentItem.parent_id) ?? null;
        const siblingTotal = helpers.getDescendantItems(parentItem.id)
          .filter(
            (item) =>
              (item.row_type === 'activity' || item.row_type === 'line_item') &&
              item.id !== childForm.itemId,
          )
          .reduce((sum, item) => sum + item.amount.planned_budget_amount, 0);
        const nextActivityTotal = siblingTotal + toNumber(childForm.plannedBudgetAmount);
        if (nextActivityTotal > parentItem.amount.planned_budget_amount) {
          setError(
            `วงเงินรวมของกิจกรรมต้องไม่เกินวงเงินกิจกรรมย่อย ${formatBudgetAmount(parentItem.amount.planned_budget_amount)} บาท`,
          );
          return;
        }
        if (!majorProject) {
          setError('ไม่พบโครงการใหญ่ของกิจกรรมย่อยที่เลือก');
          return;
        }
      } else if (parentItem.row_type === 'major_project') {
        const siblingTotal = helpers.getDescendantItems(parentItem.id)
          .filter(
            (item) =>
              (item.row_type === 'activity' || item.row_type === 'line_item') &&
              item.id !== childForm.itemId,
          )
          .reduce((sum, item) => sum + item.amount.planned_budget_amount, 0);
        const nextSubProjectTotal = siblingTotal + toNumber(childForm.plannedBudgetAmount);
        if (nextSubProjectTotal > parentItem.amount.planned_budget_amount) {
          setError(
            `วงเงินรวมของโครงการย่อยต้องไม่เกินวงเงินโครงการใหญ่ ${formatBudgetAmount(parentItem.amount.planned_budget_amount)} บาท`,
          );
          return;
        }
      }

      const rowType: BudgetUtilizationRowType =
        parentItem.row_type === 'sub_project'
          ? 'activity'
          : parentItem.row_type === 'major_project'
            ? 'sub_project'
            : 'line_item';
      const payload = toItemPayload(
        activeReportPeriodId,
        { ...childForm, rowType },
        childForm.parentId,
        helpers.getChildSequenceLabel(parentItem, childForm.itemId),
      );

      if (childForm.itemId) {
        await updateBudgetItem(payload);
      } else {
        await createBudgetItem(payload);
      }

      setChildForm({
        ...emptyChildForm,
        parentId: selectedSubActivityId || selectedCategoryId,
        rowType: selectedSubActivityId ? 'activity' : 'line_item',
      });
      await loadData(activeReportPeriodId);
    } catch (saveError) {
      setError(getSafeUserErrorMessage(saveError, 'ไม่สามารถบันทึกรายการงบประมาณได้'));
    } finally {
      setSavingMutation(false);
    }
  };

  const confirmDelete = async (currentReportPeriodId: string) => {
    if (!deleteTarget) return;
    if (helpers.getDirectChildCount(deleteTarget.id) > 0) {
      setError('ลบหัวข้อนี้ไม่ได้ เนื่องจากยังมีรายการอยู่ภายใต้หัวข้อนี้');
      setDeleteTarget(null);
      return;
    }

    try {
      setSavingMutation(true);
      setError(null);
      const deletedItemId = deleteTarget.id;
      await deleteBudgetItem(deletedItemId);
      setDeleteTarget(null);
      onAfterItemDeleted?.(deletedItemId);
      await loadData(currentReportPeriodId);
    } catch (deleteError) {
      setError(getSafeUserErrorMessage(deleteError, 'ไม่สามารถลบรายการงบประมาณได้'));
    } finally {
      setSavingMutation(false);
    }
  };

  const editModalHasChildren = editModalItem ? helpers.getDirectChildCount(editModalItem.id) > 0 : false;
  const editModalAmount = editModalItem
    ? (helpers.rollupMap.get(editModalItem.id) ?? normalizeAmount(editModalItem.amount))
    : null;
  const editModalParent = editModalItem?.parent_id
    ? (helpers.allBudgetItems.find((item) => item.id === editModalItem.parent_id) ?? null)
    : null;
  const cellEditHasRecordedData = cellEdit
    ? Math.abs(toNumber(cellEdit.value)) > 0.005 ||
      Boolean(cellEdit.allocationDate) ||
      Boolean(cellEdit.documentNumber)
    : false;

  return {
    mainForm,
    setMainForm,
    majorProjectForm,
    setMajorProjectForm,
    subActivityForm,
    setSubActivityForm,
    childForm,
    setChildForm,
    isCategoryManagerOpen,
    setIsCategoryManagerOpen,
    editModalItem,
    setEditModalItem,
    editModalForm,
    setEditModalForm,
    editModalError,
    setEditModalError,
    cellEdit,
    setCellEdit,
    cellEditError,
    deleteTarget,
    setDeleteTarget,
    savingMutation,
    startEdit,
    closeEditModal,
    saveEditModal,
    openAmountCellEdit,
    openAllocationCellEdit,
    closeCellEdit,
    saveCellEdit,
    saveMainForm,
    saveMajorProjectForm,
    saveSubActivityForm,
    saveChildForm,
    confirmDelete,
    editModalHasChildren,
    editModalAmount,
    editModalParent,
    cellEditHasRecordedData,
  };
}

