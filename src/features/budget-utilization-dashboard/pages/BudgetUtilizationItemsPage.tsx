import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, RefreshCw, Settings2, Table2, WalletCards } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { PageHeader } from '../../../components/ui/PageHeader';
import { ConfirmModal } from '../../../components/ui/ConfirmModal';
import { useAuditPageAccess } from '../../../hooks/useAuditPageAccess';
import { useAuthStore } from '../../../stores/auth.store';
import {
  canManageBudgetItems,
  getBudgetDashboardSummary,
  listBudgetReportPeriods,
} from '../services/budgetUtilization.service';
import type {
  BudgetUtilizationDashboardSummary,
  BudgetUtilizationItemWithAmount,
  BudgetUtilizationReportPeriod,
} from '../types/budgetUtilization.types';
import { getSafeUserErrorMessage } from '../../../utils/errorHandling';
import type { ItemsPageTab } from '../types/budgetItems.types';
import {
  emptyChildForm,
  emptyMainForm,
  emptyMajorProjectForm,
  emptySubActivityForm,
  emptyTrancheForm,
  initialAllocationForm,
  initialDisbursementForm,
} from '../constants/budgetItems.constants';
import { getBudgetItemSearchLabel } from '../utils/budgetItems.utils';
import { BudgetDataEntryModal } from '../components/items/BudgetDataEntryModal';
import { AllocationEntryModal } from '../components/items/AllocationEntryModal';
import { BudgetItemsHierarchyForms } from '../components/items/BudgetItemsHierarchyForms';
import { BudgetItemsTable } from '../components/items/BudgetItemsTable';
import { FormulaAuditModal } from '../components/items/FormulaAuditModal';
import { CellEditModal } from '../components/items/CellEditModal';
import { BudgetItemDetailModal } from '../components/items/BudgetItemDetailModal';
import { CategoryManagerModal } from '../components/items/CategoryManagerModal';
import { TrancheManagerModal } from '../components/items/TrancheManagerModal';
import { useBudgetHierarchyState } from '../hooks/useBudgetHierarchyState';
import { useBudgetTranches } from '../hooks/useBudgetTranches';
import { useBudgetTransactions } from '../hooks/useBudgetTransactions';
import { useBudgetHierarchyMutations } from '../hooks/useBudgetHierarchyMutations';

export function BudgetUtilizationItemsPage() {
  useAuditPageAccess({
    module: 'budget_utilization',
    action: 'budget_items_access',
    route: '/budget-utilization/items',
  });
  const [searchParams, setSearchParams] = useSearchParams();
  const role = useAuthStore((state) => state.profile?.role);
  const permissions = useAuthStore((state) => state.permissions);
  const canManage = canManageBudgetItems(role, permissions);
  const [reportPeriodId, setReportPeriodId] = useState('');
  const [reportPeriods, setReportPeriods] = useState<BudgetUtilizationReportPeriod[]>([]);
  const [summary, setSummary] = useState<BudgetUtilizationDashboardSummary | null>(null);
  const [keyword, setKeyword] = useState('');
  const [activeTab, setActiveTab] = useState<ItemsPageTab>('transactions');
  const [isAllocationEntryOpen, setIsAllocationEntryOpen] = useState(false);
  const [isBudgetDataEntryOpen, setIsBudgetDataEntryOpen] = useState(false);
  const [isFormulaAuditOpen, setIsFormulaAuditOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const selectedDisbursementDetailsRef = useRef<HTMLDivElement | null>(null);

  const hierarchy = useBudgetHierarchyState(summary);

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
        tranches.setTrancheDefinitions(loadedTranches);
        tranches.setTrancheDrafts(loadedTranches);
      }
      return dashboardSummary;
    } catch (loadError) {
      setError(getSafeUserErrorMessage(loadError, 'ไม่สามารถโหลดรายการงบประมาณได้'));
      return null;
    } finally {
      setLoading(false);
    }
  };

  const tranches = useBudgetTranches(
    hierarchy.budgetLineItems,
    reportPeriodId,
    loadData,
    setError,
  );

  const ensureReportPeriodId = async () => {
    if (reportPeriodId) return reportPeriodId;
    throw new Error('กรุณาสร้างและเลือกปีงบประมาณก่อนกรอกข้อมูล');
  };

  const transactions = useBudgetTransactions(
    hierarchy.budgetLineItems,
    summary,
    tranches.trancheDefinitions,
    hierarchy.rollupMap,
    ensureReportPeriodId,
    loadData,
    setError,
  );

  const handleAfterItemModified = (refreshedItem: BudgetUtilizationItemWithAmount | null) => {
    if (refreshedItem && transactions.allocationForm.itemId === refreshedItem.id) {
      hierarchy.setAllocationItemSearch(getBudgetItemSearchLabel(refreshedItem));
      transactions.applySelectedAllocationItemValue(refreshedItem, transactions.allocationForm.trancheKey);
    }
    if (refreshedItem && transactions.disbursementForm.itemId === refreshedItem.id) {
      hierarchy.setTransactionItemSearch(getBudgetItemSearchLabel(refreshedItem));
      transactions.applySelectedDisbursementItemValue(refreshedItem);
    }
    if (refreshedItem && transactions.centralTransferForm.itemId === refreshedItem.id) {
      transactions.applySelectedCentralTransferItemValue(refreshedItem);
    }
    if (refreshedItem && transactions.departmentTransferForm.itemId === refreshedItem.id) {
      transactions.applySelectedDepartmentTransferItemValue(refreshedItem);
    }
    if (refreshedItem && transactions.divisionTransferForm.itemId === refreshedItem.id) {
      transactions.applySelectedDivisionTransferItemValue(refreshedItem);
    }
    if (refreshedItem && transactions.commitmentForm.itemId === refreshedItem.id) {
      transactions.applySelectedCommitmentItemValue(refreshedItem);
    }
  };

  const handleAfterItemDeleted = (deletedItemId: string) => {
    if (transactions.allocationForm.itemId === deletedItemId) {
      hierarchy.setAllocationItemSearch('');
      transactions.setAllocationForm((current) => ({
        ...initialAllocationForm,
        trancheKey: current.trancheKey,
      }));
    }
    if (transactions.disbursementForm.itemId === deletedItemId) {
      hierarchy.setTransactionItemSearch('');
      transactions.setDisbursementForm(initialDisbursementForm);
      transactions.applySelectedDisbursementItemValue(null);
    }
  };

  const mutations = useBudgetHierarchyMutations(
    hierarchy,
    summary,
    ensureReportPeriodId,
    loadData,
    setError,
    handleAfterItemModified,
    handleAfterItemDeleted,
  );

  const isSaving =
    tranches.savingTranche || transactions.savingTransaction || mutations.savingMutation;

  useEffect(() => {
    const initialReportPeriodId = searchParams.get('period') ?? '';
    void Promise.all([
      listBudgetReportPeriods().then(setReportPeriods),
      loadData(initialReportPeriodId),
    ]);
  }, []);

  const selectReportPeriod = (nextReportPeriodId: string) => {
    setSearchParams({ period: nextReportPeriodId }, { replace: true });
    hierarchy.setSelectedCategoryId('');
    hierarchy.setSelectedMajorProjectId('');
    hierarchy.setSelectedSubActivityId('');
    mutations.setMainForm(emptyMainForm);
    mutations.setMajorProjectForm(emptyMajorProjectForm);
    mutations.setSubActivityForm(emptySubActivityForm);
    mutations.setChildForm(emptyChildForm);
    hierarchy.setAllocationItemSearch('');
    hierarchy.setTransactionItemSearch('');
    transactions.setAllocationForm(initialAllocationForm);
    transactions.setDisbursementForm(initialDisbursementForm);
    mutations.setEditModalItem(null);
    mutations.setCellEdit(null);
    void loadData(nextReportPeriodId);
  };

  const displayFiscalYear = summary?.reportPeriod?.fiscal_year ?? '-';
  const selectableReportPeriods = useMemo(
    () =>
      reportPeriods.filter(
        (period, index, periods) =>
          period.id === reportPeriodId ||
          periods.findIndex((candidate) => candidate.fiscal_year === period.fiscal_year) === index,
      ),
    [reportPeriodId, reportPeriods],
  );

  const filteredItems = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();
    if (!normalizedKeyword) return hierarchy.hierarchyItems;

    const matchesKeyword = (item: BudgetUtilizationItemWithAmount) =>
      `${item.sequence_label ?? ''} ${item.item_name} ${item.output_label ?? ''} ${item.activity_sequence_label ?? ''} ${item.activity_label ?? ''}`
        .toLowerCase()
        .includes(normalizedKeyword);
    const itemById = new Map(hierarchy.allBudgetItems.map((item) => [item.id, item]));
    const visibleIds = new Set(hierarchy.allBudgetItems.filter(matchesKeyword).map((item) => item.id));
    hierarchy.allBudgetItems.filter(matchesKeyword).forEach((item) => {
      let parentId = item.parent_id;
      while (parentId) {
        visibleIds.add(parentId);
        parentId = itemById.get(parentId)?.parent_id ?? null;
      }
    });

    return hierarchy.hierarchyItems.filter((item) => visibleIds.has(item.id));
  }, [hierarchy.allBudgetItems, hierarchy.hierarchyItems, keyword]);

  const selectTransactionBudgetItem = (item: BudgetUtilizationItemWithAmount) => {
    hierarchy.setTransactionItemSearch(getBudgetItemSearchLabel(item));
    transactions.setDisbursementForm((current) => ({ ...current, itemId: item.id }));
    transactions.applySelectedDisbursementItemValue(item);
  };

  const selectAllocationBudgetItem = (item: BudgetUtilizationItemWithAmount) => {
    hierarchy.setAllocationItemSearch(getBudgetItemSearchLabel(item));
    transactions.setAllocationForm((current) => ({ ...current, itemId: item.id }));
    transactions.applySelectedAllocationItemValue(item, transactions.allocationForm.trancheKey);
  };

  const selectSubActivityBudgetItem = (item: BudgetUtilizationItemWithAmount) => {
    setActiveTab('transactions');
    selectAllocationBudgetItem(item);
    selectTransactionBudgetItem(item);
  };

  useEffect(() => {
    if (!transactions.disbursementForm.itemId) return;

    const frameId = window.requestAnimationFrame(() => {
      selectedDisbursementDetailsRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [transactions.disbursementForm.itemId]);

  const openFormulaAudit = () => {
    hierarchy.setFormulaAuditItemId((current) => current || hierarchy.formulaAuditItems[0]?.id || '');
    setIsFormulaAuditOpen(true);
  };

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <PageHeader
          title="รายการงบประมาณ"
          description={
            summary?.reportPeriod
              ? `กำลังกรอกข้อมูลปีงบประมาณ ${summary.reportPeriod.fiscal_year}`
              : 'กรุณาเลือกปีงบประมาณ'
          }
        />
        <div className="flex flex-wrap items-end gap-2">
          <label className="block">
            <span className="text-xs font-semibold text-slate-600">
              ปีงบประมาณที่ต้องการกรอก
            </span>
            <select
              value={reportPeriodId}
              onChange={(event) => selectReportPeriod(event.target.value)}
              disabled={loading || selectableReportPeriods.length === 0}
              className="mt-1 h-10 min-w-56 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-900 shadow-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 disabled:opacity-60"
            >
              {selectableReportPeriods.length === 0 ? (
                <option value="">ยังไม่มีปีงบประมาณ</option>
              ) : null}
              {selectableReportPeriods.map((period) => (
                <option key={period.id} value={period.id}>
                  ปีงบประมาณ {period.fiscal_year}
                  {period.is_active ? ' (ใช้งานอยู่)' : ''}
                  {reportPeriods.filter((candidate) => candidate.fiscal_year === period.fiscal_year)
                    .length > 1
                    ? ` — ${period.title}`
                    : ''}
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
        <BudgetItemsHierarchyForms
          saving={isSaving}
          mainBudgetItems={hierarchy.mainBudgetItems}
          selectedCategoryId={hierarchy.selectedCategoryId}
          setSelectedCategoryId={hierarchy.setSelectedCategoryId}
          selectedCategory={hierarchy.selectedMainCategory}
          isOperationsCategorySelected={hierarchy.isOperationsCategorySelected}
          mainForm={mutations.mainForm}
          setMainForm={mutations.setMainForm}
          saveMainForm={mutations.saveMainForm}
          majorProjectBudgetItems={hierarchy.selectedCategoryMajorProjects}
          selectedMajorProjectId={hierarchy.selectedMajorProjectId}
          setSelectedMajorProjectId={hierarchy.setSelectedMajorProjectId}
          selectedMajorProject={hierarchy.selectedMajorProject}
          majorProjectForm={mutations.majorProjectForm}
          setMajorProjectForm={mutations.setMajorProjectForm}
          saveMajorProjectForm={() =>
            mutations.saveMajorProjectForm(
              hierarchy.setSelectedMajorProjectId,
              hierarchy.setSelectedSubActivityId,
            )
          }
          selectedMajorProjectSubActivities={hierarchy.selectedMajorProjectSubActivities}
          selectedSubActivityId={hierarchy.selectedSubActivityId}
          setSelectedSubActivityId={hierarchy.setSelectedSubActivityId}
          selectedSubActivity={hierarchy.selectedSubActivity}
          subActivityForm={mutations.subActivityForm}
          setSubActivityForm={mutations.setSubActivityForm}
          saveSubActivityForm={() =>
            mutations.saveSubActivityForm(hierarchy.setSelectedSubActivityId)
          }
          childForm={mutations.childForm}
          setChildForm={mutations.setChildForm}
          saveChildForm={() =>
            mutations.saveChildForm(
              hierarchy.selectedSubActivity?.id ?? '',
              hierarchy.selectedCategoryId,
            )
          }
          selectedSubActivityBudgetItems={hierarchy.selectedSubActivityBudgetItems}
          selectedAllocationItem={transactions.selectedAllocationItem}
          selectedDisbursementItem={transactions.selectedDisbursementItem}
          onSelectSubActivityBudgetItem={selectSubActivityBudgetItem}
          onStartEdit={mutations.startEdit}
          onSetDeleteTarget={mutations.setDeleteTarget}
          onResetCategoryForm={() => mutations.setMainForm(emptyMainForm)}
          onOpenCategoryManager={() => {
            mutations.setMainForm(emptyMainForm);
            mutations.setIsCategoryManagerOpen(true);
          }}
          allBudgetItems={hierarchy.allBudgetItems}
        />
      ) : null}

      {canManage ? (
        <div className="mt-4 border-b border-slate-200" role="tablist" aria-label="ส่วนงานรายการงบประมาณ">
          <div className="flex min-w-max gap-6 overflow-x-auto px-1">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'transactions'}
              onClick={() => setActiveTab('transactions')}
              className={`inline-flex h-11 items-center gap-2 border-b-2 px-1 text-sm font-semibold transition ${
                activeTab === 'transactions'
                  ? 'border-sky-700 text-sky-800'
                  : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800'
              }`}
            >
              <WalletCards className="h-4 w-4" aria-hidden="true" />
              บันทึกข้อมูลงบประมาณ
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'items'}
              onClick={() => setActiveTab('items')}
              className={`inline-flex h-11 items-center gap-2 border-b-2 px-1 text-sm font-semibold transition ${
                activeTab === 'items'
                  ? 'border-sky-700 text-sky-800'
                  : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800'
              }`}
            >
              <Table2 className="h-4 w-4" aria-hidden="true" />
              รายการงบประมาณทั้งหมด
            </button>
          </div>
        </div>
      ) : null}

      {canManage && activeTab === 'transactions' ? (
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
                  <span className="mt-1 block text-sm text-slate-600">
                    เลือกรายการ งวด วันที่ และจำนวนเงินจัดสรร
                  </span>
                  <span className="mt-3 block truncate text-xs font-semibold text-amber-800">
                    {transactions.selectedAllocationItem
                      ? `รายการที่เลือก: ${getBudgetItemSearchLabel(transactions.selectedAllocationItem)}`
                      : 'กดเพื่อเลือกรายการและกรอกข้อมูล'}
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
                  <span className="mt-1 block text-sm text-slate-600">
                    เลือกส่วนกลางกรมฯ ภายในกรม ภายในกอง ผูกพัน หรือเบิก-จ่าย
                  </span>
                  <span className="mt-3 block truncate text-xs font-semibold text-sky-800">
                    {transactions.selectedDisbursementItem
                      ? `รายการที่เลือก: ${getBudgetItemSearchLabel(transactions.selectedDisbursementItem)}`
                      : 'กดเพื่อเลือกรายการและกรอกข้อมูล'}
                  </span>
                </span>
              </span>
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-4">
          <BudgetItemsTable
            canManage={canManage}
            loading={loading}
            summary={summary}
            keyword={keyword}
            setKeyword={setKeyword}
            onOpenFormulaAudit={openFormulaAudit}
            displayFiscalYear={displayFiscalYear}
            trancheDefinitions={tranches.trancheDefinitions}
            filteredItems={filteredItems}
            tableTotals={hierarchy.tableTotals}
            rollupMap={hierarchy.rollupMap}
            getDirectChildCount={hierarchy.getDirectChildCount}
            onStartEdit={mutations.startEdit}
            onOpenAllocationCellEdit={mutations.openAllocationCellEdit}
            onOpenAmountCellEdit={mutations.openAmountCellEdit}
            onSetDeleteTarget={mutations.setDeleteTarget}
            onError={setError}
          />
        </div>
      )}

      <BudgetDataEntryModal
        isOpen={isBudgetDataEntryOpen}
        onClose={() => setIsBudgetDataEntryOpen(false)}
        saving={isSaving}
        canManage={canManage}
        transactionItemSearch={hierarchy.transactionItemSearch}
        onTransactionItemSearchChange={(value) => {
          hierarchy.setTransactionItemSearch(value);
          if (
            transactions.selectedDisbursementItem &&
            value !== getBudgetItemSearchLabel(transactions.selectedDisbursementItem)
          ) {
            transactions.setDisbursementForm(initialDisbursementForm);
            transactions.applySelectedDisbursementItemValue(null);
          }
        }}
        transactionItemSearchResults={hierarchy.transactionItemSearchResults}
        selectedDisbursementItem={transactions.selectedDisbursementItem}
        selectedDisbursementAmount={transactions.selectedDisbursementAmount}
        displayFiscalYear={displayFiscalYear}
        onSelectTransactionBudgetItem={selectTransactionBudgetItem}
        onEditAmount={(field, label, value) =>
          mutations.openAmountCellEdit(null, transactions.selectedDisbursementItem!, field, label, value)
        }
        selectedDisbursementDetailsRef={selectedDisbursementDetailsRef}
      />

      <AllocationEntryModal
        isOpen={isAllocationEntryOpen}
        onClose={() => setIsAllocationEntryOpen(false)}
        saving={isSaving}
        allocationForm={transactions.allocationForm}
        setAllocationForm={transactions.setAllocationForm}
        allocationItemSearch={hierarchy.allocationItemSearch}
        setAllocationItemSearch={hierarchy.setAllocationItemSearch}
        allocationItemSearchResults={hierarchy.allocationItemSearchResults}
        selectedAllocationItem={transactions.selectedAllocationItem}
        trancheDefinitions={tranches.trancheDefinitions}
        onOpenTrancheManager={() => {
          tranches.setTrancheDrafts(tranches.trancheDefinitions);
          tranches.setTrancheForm(emptyTrancheForm);
          tranches.setIsTrancheManagerOpen(true);
        }}
        selectAllocationBudgetItem={selectAllocationBudgetItem}
        applySelectedAllocationItemValue={transactions.applySelectedAllocationItemValue}
        saveAllocationForm={transactions.saveAllocationForm}
      />

      <FormulaAuditModal
        isOpen={isFormulaAuditOpen}
        onClose={() => setIsFormulaAuditOpen(false)}
        formulaAuditItemId={hierarchy.formulaAuditItemId}
        setFormulaAuditItemId={hierarchy.setFormulaAuditItemId}
        formulaAuditItem={hierarchy.formulaAuditItem}
        formulaAuditItems={hierarchy.formulaAuditItems}
        formulaAuditRows={hierarchy.formulaAuditRows}
        hierarchyAuditIssues={hierarchy.hierarchyAuditIssues}
      />

      <CellEditModal
        cellEdit={mutations.cellEdit}
        onClose={mutations.closeCellEdit}
        onSave={mutations.saveCellEdit}
        saving={isSaving}
        cellEditError={mutations.cellEditError}
        setCellEdit={mutations.setCellEdit}
        cellEditHasRecordedData={mutations.cellEditHasRecordedData}
      />

      <BudgetItemDetailModal
        isOpen={Boolean(mutations.editModalItem)}
        onClose={mutations.closeEditModal}
        saving={isSaving}
        canManage={canManage}
        editModalItem={mutations.editModalItem}
        editModalForm={mutations.editModalForm}
        setEditModalForm={mutations.setEditModalForm}
        editModalParent={mutations.editModalParent}
        editModalHasChildren={mutations.editModalHasChildren}
        editModalAmount={mutations.editModalAmount}
        trancheDefinitions={tranches.trancheDefinitions}
        editModalError={mutations.editModalError}
        onSave={mutations.saveEditModal}
        onOpenAllocationCellEdit={mutations.openAllocationCellEdit}
        onOpenAmountCellEdit={mutations.openAmountCellEdit}
      />

      <CategoryManagerModal
        isOpen={mutations.isCategoryManagerOpen}
        onClose={() => {
          mutations.setIsCategoryManagerOpen(false);
          mutations.setMainForm(emptyMainForm);
        }}
        saving={isSaving}
        mainForm={mutations.mainForm}
        setMainForm={mutations.setMainForm}
        mainBudgetItems={hierarchy.mainBudgetItems}
        getCategoryChildCount={hierarchy.getCategoryChildCount}
        saveMainForm={mutations.saveMainForm}
        onSetDeleteTarget={mutations.setDeleteTarget}
        onError={setError}
      />

      <TrancheManagerModal
        isOpen={tranches.isTrancheManagerOpen}
        onClose={() => tranches.setIsTrancheManagerOpen(false)}
        saving={isSaving}
        trancheForm={tranches.trancheForm}
        setTrancheForm={tranches.setTrancheForm}
        trancheDrafts={tranches.trancheDrafts}
        setTrancheDrafts={tranches.setTrancheDrafts}
        trancheDefinitions={tranches.trancheDefinitions}
        saveTrancheDraft={tranches.saveTrancheDraft}
        deleteTrancheDraft={tranches.deleteTrancheDraft}
        saveTrancheDefinitions={() =>
          tranches.saveTrancheDefinitions((definitions) => {
            const nextKey = definitions.some(
              (tranche) => tranche.key === transactions.allocationForm.trancheKey,
            )
              ? transactions.allocationForm.trancheKey
              : definitions[0]?.key ?? '';
            transactions.setAllocationForm((current) => ({ ...current, trancheKey: nextKey }));
            transactions.applySelectedAllocationItemValue(transactions.selectedAllocationItem, nextKey);
          })
        }
        getTrancheUsageCount={tranches.getTrancheUsageCount}
      />

      <ConfirmModal
        isOpen={Boolean(mutations.deleteTarget)}
        onClose={() => mutations.setDeleteTarget(null)}
        onConfirm={() => mutations.confirmDelete(reportPeriodId)}
        title="ยืนยันการลบรายการ"
        message={`ต้องการลบ ${mutations.deleteTarget?.item_name ?? ''} ใช่หรือไม่?`}
        confirmLabel="ลบรายการ"
        cancelLabel="ยกเลิก"
        isLoading={isSaving}
        variant="danger"
        zIndexClassName="z-[70]"
      />
    </div>
  );
}
