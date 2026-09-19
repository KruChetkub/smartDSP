import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  BarChart3,
  Coins,
  DatabaseZap,
  RefreshCw,
  TrendingUp,
  WalletCards,
} from 'lucide-react';
import { PageHeader } from '../../../components/ui/PageHeader';
import { useAuditPageAccess } from '../../../hooks/useAuditPageAccess';
import { getBudgetDashboardSummary, listBudgetReportPeriods } from '../services/budgetUtilization.service';
import {
  buildHierarchyRollupMap,
  formatBudgetAmount,
  getNetAllocationTotal,
  percent,
} from '../utils/budgetUtilizationCalculations';
import type {
  BudgetUtilizationDashboardSummary,
  BudgetUtilizationItemWithAmount,
  BudgetUtilizationReportPeriod,
} from '../types/budgetUtilization.types';
import { getSafeUserErrorMessage } from '../../../utils/errorHandling';
import { BudgetYearComparisonSection } from '../components/BudgetYearComparisonSection';

import type {
  ProjectPlanDetailRow,
  QuarterKey,
} from '../types/budgetDashboard.types';
import {
  assessmentGroupOrder,
  assessmentTargets,
} from '../types/budgetDashboard.types';
import {
  buildDatabaseWorkbook,
  formatExactBaht,
  formatThaiDataUpdate,
  getCategoryAmount,
  getProjectRootSequence,
  getRawActualByGroup,
  getRawDashboardRows,
  getRawPlanCategoryData,
  getRawPlanDetailRows,
} from '../utils/budgetDashboard.utils';
import { StatCard } from '../components/StatCard';
import { QuarterAssessmentSection } from '../components/QuarterAssessmentSection';
import {
  AllocationPie,
  PlanCategoryBarChart,
  PlannedCategoryPie,
  type PlanChartItem,
} from '../components/BudgetChartsSection';
import { PlanDetailTable } from '../components/PlanDetailTable';
import { ProjectHierarchyTable } from '../components/ProjectHierarchyTable';

export function BudgetUtilizationDashboardPage() {
  useAuditPageAccess({ module: 'budget_utilization', action: 'budget_dashboard_access', route: '/budget-utilization' });
  const [summary, setSummary] = useState<BudgetUtilizationDashboardSummary | null>(null);
  const [reportPeriods, setReportPeriods] = useState<BudgetUtilizationReportPeriod[]>([]);
  const [selectedReportPeriodId, setSelectedReportPeriodId] = useState('');
  const [comparisonSummary, setComparisonSummary] = useState<BudgetUtilizationDashboardSummary | null>(null);
  const [selectedComparisonReportPeriodId, setSelectedComparisonReportPeriodId] = useState('');
  const [comparisonLoading, setComparisonLoading] = useState(false);
  const [selectedQuarter, setSelectedQuarter] = useState<QuarterKey>('q4');
  const [selectedRawPlanCategoryKey, setSelectedRawPlanCategoryKey] = useState('personnel');
  const [showProjectBar, setShowProjectBar] = useState<boolean>(false);
  const [showBottomTable, setShowBottomTable] = useState<boolean>(false);
  const [expandedProjectIds, setExpandedProjectIds] = useState<string[]>([]);
  const [hasPlanBarClicked, setHasPlanBarClicked] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const projectTableRef = useRef<HTMLDivElement | null>(null);

  const loadData = async (reportPeriodId?: string | null) => {
    try {
      setLoading(true);
      setError(null);
      setShowProjectBar(false);
      setShowBottomTable(false);
      setExpandedProjectIds([]);
      setHasPlanBarClicked(false);
      setSelectedRawPlanCategoryKey('personnel');
      const dashboardSummary = await getBudgetDashboardSummary(reportPeriodId || null);
      setSummary(dashboardSummary);
      setSelectedReportPeriodId(dashboardSummary.reportPeriod?.id ?? '');
    } catch (loadError) {
      setError(getSafeUserErrorMessage(loadError, 'ไม่สามารถโหลด Dashboard งบประมาณได้'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void Promise.all([
      listBudgetReportPeriods().then(setReportPeriods),
      loadData(null),
    ]);
  }, []);

  const selectPrimaryReportPeriod = (reportPeriodId: string) => {
    if (reportPeriodId === selectedComparisonReportPeriodId) {
      setSelectedComparisonReportPeriodId('');
      setComparisonSummary(null);
    }
    void loadData(reportPeriodId);
  };

  const selectComparisonReportPeriod = async (reportPeriodId: string) => {
    setSelectedComparisonReportPeriodId(reportPeriodId);
    if (!reportPeriodId) {
      setComparisonSummary(null);
      return;
    }

    try {
      setComparisonLoading(true);
      setError(null);
      setComparisonSummary(await getBudgetDashboardSummary(reportPeriodId));
    } catch (loadError) {
      setError(getSafeUserErrorMessage(loadError, 'ไม่สามารถโหลดข้อมูลปีงบประมาณที่ต้องการเปรียบเทียบได้'));
    } finally {
      setComparisonLoading(false);
    }
  };

  const selectableReportPeriods = useMemo(
    () =>
      reportPeriods.filter(
        (period, index, periods) =>
          periods.findIndex((candidate) => candidate.fiscal_year === period.fiscal_year) === index,
      ),
    [reportPeriods],
  );
  const databaseWorkbook = useMemo(() => buildDatabaseWorkbook(summary), [summary]);
  const rawWorkbook = databaseWorkbook;
  const rawDashboard = useMemo(() => getRawDashboardRows(rawWorkbook), [rawWorkbook]);
  const rawTotal = rawDashboard.total;
  const rawCategoryData = rawDashboard.categories;

  const rawPlanCategoryData = useMemo(() => getRawPlanCategoryData(rawCategoryData), [rawCategoryData]);

  const visiblePlanCategoryData = useMemo(() => {
    const keys = ['personnel', 'investment', 'operations_total'];
    if (showProjectBar) {
      keys.push('project');
    }

    const visibleCategories = rawPlanCategoryData.filter((item) => keys.includes(item.key));
    if (!showProjectBar || !showBottomTable) return visibleCategories;

    const projectCategory = rawPlanCategoryData.find((item) => item.key === 'project');
    if (!projectCategory) return visibleCategories;

    return visibleCategories.map((item) => {
      if (item.key !== 'operations_total') return item;

      const netTotal = item.netTotal - projectCategory.netTotal;
      const disbursedTotal = item.disbursedTotal - projectCategory.disbursedTotal;
      const utilizationTotal = item.utilizationTotal - projectCategory.utilizationTotal;

      return {
        ...item,
        planned: item.planned - projectCategory.planned,
        allocation1: item.allocation1 - projectCategory.allocation1,
        allocation2: item.allocation2 - projectCategory.allocation2,
        allocation3: item.allocation3 - projectCategory.allocation3,
        netTotal,
        centralIn: item.centralIn - projectCategory.centralIn,
        centralOut: item.centralOut - projectCategory.centralOut,
        divisionIn: item.divisionIn - projectCategory.divisionIn,
        divisionOut: item.divisionOut - projectCategory.divisionOut,
        committedPo: item.committedPo - projectCategory.committedPo,
        committedWithoutPo: item.committedWithoutPo - projectCategory.committedWithoutPo,
        committedTotal: item.committedTotal - projectCategory.committedTotal,
        disbursedGeneral: item.disbursedGeneral - projectCategory.disbursedGeneral,
        disbursedAdvance: item.disbursedAdvance - projectCategory.disbursedAdvance,
        disbursedTotal,
        utilizationTotal,
        remaining: item.remaining - projectCategory.remaining,
        disbursementRate: percent(disbursedTotal, netTotal),
        utilizationWithPoRate: percent(utilizationTotal, netTotal),
      };
    });
  }, [rawPlanCategoryData, showBottomTable, showProjectBar]);

  const visiblePlanChartData = useMemo<PlanChartItem[]>(
    () =>
      visiblePlanCategoryData.map((item) => {
        const allocatedBudget = item.netTotal;
        const remainingFromAllocation = Math.max(0, item.remaining);
        const remainingFromAllocationRate = allocatedBudget > 0 ? (remainingFromAllocation * 100) / allocatedBudget : 0;
        const disbursementRate = allocatedBudget > 0 ? (item.disbursedTotal * 100) / allocatedBudget : 0;

        return {
          ...item,
          allocatedBudget,
          remainingFromAllocation,
          remainingFromAllocationRate,
          disbursementRateLabel: `เบิก ${formatBudgetAmount(disbursementRate)}%`,
          remainingFromAllocationLabel: `เหลือ ${formatBudgetAmount(remainingFromAllocationRate)}%`,
        };
      }),
    [visiblePlanCategoryData],
  );

  const selectedRawPlanCategory =
    rawPlanCategoryData.find((item) => item.key === selectedRawPlanCategoryKey) ??
    rawPlanCategoryData[0] ??
    rawTotal;

  const selectedRawPlanDetailRows = useMemo(() => {
    const keyToFetch = selectedRawPlanCategoryKey === 'operations_total' ? 'operations' : selectedRawPlanCategoryKey;
    return getRawPlanDetailRows(rawWorkbook, keyToFetch);
  }, [rawWorkbook, selectedRawPlanCategoryKey]);

  const selectedPlanStats = useMemo(() => {
    const fallback = {
      netTotal: rawTotal?.netTotal ?? 0,
      disbursedTotal: rawTotal?.disbursedTotal ?? 0,
      remaining: rawTotal?.remaining ?? 0,
      disbursementRate: rawTotal?.disbursementRate ?? 0,
    };
    if (!hasPlanBarClicked) return fallback;
    const activeKey = showBottomTable ? 'project' : selectedRawPlanCategoryKey;
    const categorySource = showBottomTable ? visiblePlanCategoryData : rawPlanCategoryData;
    const cat = categorySource.find((item) => item.key === activeKey);
    if (!cat) return fallback;
    return {
      netTotal: cat.netTotal,
      disbursedTotal: cat.disbursedTotal,
      remaining: cat.remaining,
      disbursementRate: cat.disbursementRate,
    };
  }, [
    hasPlanBarClicked,
    showBottomTable,
    selectedRawPlanCategoryKey,
    rawPlanCategoryData,
    rawTotal,
    visiblePlanCategoryData,
  ]);

  const projectPlanDetailRows = useMemo(() => {
    const normalizedItems = summary?.items ?? [];
    const rollup = buildHierarchyRollupMap(normalizedItems);
    const childrenByParent = new Map<string, BudgetUtilizationItemWithAmount[]>();
    normalizedItems.forEach((item) => {
      if (!item.parent_id) return;
      const children = childrenByParent.get(item.parent_id) ?? [];
      children.push(item);
      childrenByParent.set(item.parent_id, children);
    });
    const sortChildItems = (left: BudgetUtilizationItemWithAmount, right: BudgetUtilizationItemWithAmount) =>
      (left.sequence_label ?? '').localeCompare(right.sequence_label ?? '', 'th', { numeric: true }) ||
      left.sort_order - right.sort_order;
    childrenByParent.forEach((children) => children.sort(sortChildItems));

    const toProjectDetailRow = (
      item: BudgetUtilizationItemWithAmount,
      ancestorIds = new Set<string>(),
    ): ProjectPlanDetailRow => {
      const amount = rollup.get(item.id) ?? getCategoryAmount(item, normalizedItems);
      const netTotal = getNetAllocationTotal(amount);
      const rawProjectName = item.source_row_data?.find((cell) => /โครงการใหญ่\s*:/.test(String(cell ?? '')));
      const nextAncestorIds = new Set(ancestorIds);
      nextAncestorIds.add(item.id);

      return {
        id: item.id,
        sequenceLabel: item.sequence_label ?? '',
        name: String(rawProjectName ?? item.item_name).trim(),
        output: item.output_label ?? '',
        activity: item.activity_label ?? item.activity_sequence_label ?? '',
        committedTotal: amount.committed_total_amount,
        utilizationTotal: amount.utilization_total_amount,
        remaining: Math.max(0, netTotal - amount.utilization_total_amount),
        disbursedTotal: amount.disbursed_total_amount,
        netTotal,
        disbursementRate: percent(amount.disbursed_total_amount, netTotal),
        children: (childrenByParent.get(item.id) ?? [])
          .filter((child) => !nextAncestorIds.has(child.id))
          .map((child) => toProjectDetailRow(child, nextAncestorIds)),
      };
    };
    const normalizedProjectRoots = ['3.5', '3.6']
      .map(
        (rootSequence) =>
          normalizedItems
            .filter(
              (item) =>
                getProjectRootSequence([
                  item.sequence_label,
                  item.raw_label,
                  ...(item.source_row_data ?? []),
                ]) === rootSequence,
            )
            .sort((left, right) => left.depth - right.depth || left.sort_order - right.sort_order)[0],
      )
      .filter((item): item is BudgetUtilizationItemWithAmount => Boolean(item));
    const normalizedProjects = normalizedProjectRoots.map((item) => toProjectDetailRow(item));

    if (normalizedProjects.length > 0) return normalizedProjects;
    return getRawPlanDetailRows(rawWorkbook, 'project').map<ProjectPlanDetailRow>((item) => ({
      ...item,
      sequenceLabel: '',
      children: [],
    }));
  }, [rawWorkbook, summary?.items]);

  const rawAssessmentRows = useMemo(
    () =>
      assessmentGroupOrder.map((group) => {
        const actual = getRawActualByGroup(group, rawTotal, rawCategoryData);
        const target = assessmentTargets[group][selectedQuarter];

        return {
          group,
          label: assessmentTargets[group].label,
          target,
          actualSpending: actual?.utilizationWithPoRate ?? 0,
          actualDisbursement: actual?.disbursementRate ?? 0,
        };
      }),
    [rawCategoryData, rawTotal, selectedQuarter],
  );

  const displayedAllocationData = useMemo(() => {
    if (!summary) {
      return [
        { name: 'รับจัดสรรงวด 1', value: rawTotal?.allocation1 ?? 0 },
        { name: 'รับจัดสรรงวด 2', value: rawTotal?.allocation2 ?? 0 },
        { name: 'รับจัดสรรงวด 3', value: rawTotal?.allocation3 ?? 0 },
      ].filter((item) => item.value > 0);
    }

    const childItemIds = new Set(
      summary.items
        .map((item) => item.parent_id)
        .filter((parentId): parentId is string => Boolean(parentId)),
    );
    const leafAllocationSource = summary.items.filter(
      (item) => item.row_type !== 'total' && !childItemIds.has(item.id),
    );

    return summary.allocationTranches
      .map((tranche) => ({
        name: tranche.label,
        value: leafAllocationSource.some((item) =>
          item.allocations?.some((allocation) => allocation.tranche_id === tranche.id),
        )
          ? leafAllocationSource.reduce(
              (total, item) =>
                total +
                (item.allocations?.find((allocation) => allocation.tranche_id === tranche.id)?.amount ?? 0),
              0,
            )
          : summary.totalItem?.allocations?.find((allocation) => allocation.tranche_id === tranche.id)?.amount ?? 0,
      }))
      .filter((item) => item.value > 0);
  }, [rawTotal, summary]);

  const hasData = Boolean(rawTotal);

  const toggleProjectExpansion = (projectId: string) => {
    setExpandedProjectIds((current) =>
      current.includes(projectId) ? current.filter((id) => id !== projectId) : [...current, projectId],
    );
  };

  const handlePlanCategoryClick = (key: string) => {
    setHasPlanBarClicked(true);
    if (key === 'operations_total') {
      setSelectedRawPlanCategoryKey('operations_total');
      setShowProjectBar(true);
      setShowBottomTable(false);
    } else if (key === 'project') {
      setShowBottomTable(true);
      setTimeout(() => {
        projectTableRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    } else {
      setSelectedRawPlanCategoryKey(key);
      setShowProjectBar(false);
      setShowBottomTable(false);
    }
  };

  const handleAllocationOverviewClick = () => {
    setHasPlanBarClicked(false);
    setSelectedRawPlanCategoryKey('personnel');
    setShowProjectBar(false);
    setShowBottomTable(false);
  };

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <PageHeader
          title="ติดตามการใช้จ่ายงบประมาณ"
          description={
            summary?.reportPeriod
              ? `${summary.reportPeriod.department_name} · ปีงบประมาณ ${summary.reportPeriod.fiscal_year}`
              : 'กองยุทธศาสตร์และแผนงาน'
          }
        />
        <div className="flex flex-wrap items-center justify-end gap-3">
          <label className="block">
            <span className="sr-only">เลือกปีงบประมาณ</span>
            <select
              value={selectedReportPeriodId}
              onChange={(event) => selectPrimaryReportPeriod(event.target.value)}
              disabled={loading || selectableReportPeriods.length === 0}
              className="h-10 min-w-52 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 disabled:opacity-60"
              aria-label="เลือกปีงบประมาณสำหรับ Dashboard"
            >
              {selectableReportPeriods.length === 0 ? <option value="">ยังไม่มีปีงบประมาณ</option> : null}
              {selectableReportPeriods.map((period) => (
                <option key={period.id} value={period.id}>
                  ปีงบประมาณ {period.fiscal_year}
                  {period.is_active ? ' (ใช้งานอยู่)' : ''}
                </option>
              ))}
            </select>
          </label>
          <p
            className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 shadow-sm"
            aria-live="polite"
          >
            {formatThaiDataUpdate(summary?.lastFinancialDataUpdate)}
          </p>
          <button
            type="button"
            onClick={() => void loadData(selectedReportPeriodId)}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
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

      {!loading && !hasData ? (
        <div className="rounded-md border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm">
          <DatabaseZap className="mx-auto h-10 w-10 text-slate-400" aria-hidden="true" />
          <h2 className="mt-3 text-lg font-semibold text-slate-950">ยังไม่มีข้อมูล Dashboard</h2>
          <p className="mt-2 text-sm text-slate-600">
            ให้ผู้ดูแลระบบสร้างปีงบประมาณและกรอกรายการงบประมาณก่อน Dashboard จะแสดงผล
          </p>
        </div>
      ) : null}

      {rawWorkbook && rawTotal ? (
        <div className="space-y-5">
          <section className="grid items-start gap-4 xl:grid-cols-[250px_minmax(0,1fr)]">
            <div className="space-y-3">
              <PlannedCategoryPie rawPlanCategoryData={rawPlanCategoryData} />
              <AllocationPie
                displayedAllocationData={displayedAllocationData}
                totalNetAllocation={rawTotal.netTotal}
                onOverviewClick={handleAllocationOverviewClick}
              />
            </div>

            <div className="flex flex-col gap-4">
              <div className="order-1 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <StatCard
                  title="ยอดรวมสุทธิ"
                  value={formatExactBaht(selectedPlanStats.netTotal)}
                  icon={Coins}
                  tone="bg-blue-50 text-blue-700 ring-blue-100"
                />
                <StatCard
                  title="เบิกจ่ายรวม"
                  value={formatExactBaht(selectedPlanStats.disbursedTotal)}
                  icon={WalletCards}
                  tone="bg-emerald-50 text-emerald-700 ring-emerald-100"
                />
                <StatCard
                  title="คงเหลือ"
                  value={formatExactBaht(selectedPlanStats.remaining)}
                  icon={BarChart3}
                  tone="bg-slate-50 text-slate-700 ring-slate-200"
                />
                <StatCard
                  title="ร้อยละเบิกจ่าย"
                  value={`${formatBudgetAmount(selectedPlanStats.disbursementRate)}%`}
                  icon={TrendingUp}
                  tone="bg-amber-50 text-amber-700 ring-amber-100"
                />
              </div>

              <div className="order-2 rounded-md border border-slate-200 bg-white p-4 shadow-sm">
                <h2 className="text-base font-bold text-slate-950">
                  เปรียบเทียบงบประมาณที่รับจัดสรร ผลเบิกจ่ายรวม และคงเหลือ
                </h2>
                <div className="mt-4 grid items-start gap-4 xl:grid-cols-[minmax(540px,0.9fr)_minmax(520px,1fr)]">
                  <div>
                    <PlanCategoryBarChart
                      chartData={visiblePlanChartData}
                      selectedCategoryKey={selectedRawPlanCategoryKey}
                      showBottomTable={showBottomTable}
                      onCategoryClick={handlePlanCategoryClick}
                    />
                  </div>

                  <div className="flex flex-col gap-4">
                    <PlanDetailTable
                      selectedCategoryName={
                        selectedRawPlanCategoryKey === 'operations_total'
                          ? 'งบดำเนินงาน (ดำเนินงานปกติ)'
                          : selectedRawPlanCategory?.name ?? 'งบประมาณ'
                      }
                      detailRows={selectedRawPlanDetailRows}
                    />
                  </div>
                </div>

                {showBottomTable ? (
                  <ProjectHierarchyTable
                    projectPlanDetailRows={projectPlanDetailRows}
                    expandedProjectIds={expandedProjectIds}
                    onToggleProjectExpansion={toggleProjectExpansion}
                    tableRef={projectTableRef}
                  />
                ) : null}
              </div>
            </div>

            <QuarterAssessmentSection
              selectedQuarter={selectedQuarter}
              onQuarterChange={setSelectedQuarter}
              assessmentRows={rawAssessmentRows}
            />
          </section>
        </div>
      ) : null}

      {summary?.reportPeriod && selectableReportPeriods.length > 1 ? (
        <BudgetYearComparisonSection
          primary={summary}
          comparison={comparisonSummary}
          reportPeriods={selectableReportPeriods}
          selectedComparisonReportPeriodId={selectedComparisonReportPeriodId}
          loading={comparisonLoading}
          onSelectComparison={(reportPeriodId) => void selectComparisonReportPeriod(reportPeriodId)}
        />
      ) : null}
    </div>
  );
}
