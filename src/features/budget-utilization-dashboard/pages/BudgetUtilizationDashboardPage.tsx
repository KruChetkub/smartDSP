import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AlertCircle, BarChart3, ChevronDown, ChevronRight, Coins, DatabaseZap, RefreshCw, TrendingUp, WalletCards } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, LabelList, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { PageHeader } from '../../../components/ui/PageHeader';
import { useAuditPageAccess } from '../../../hooks/useAuditPageAccess';
import { getBudgetDashboardSummary, listBudgetReportPeriods } from '../services/budgetUtilization.service';
import { buildHierarchyRollupMap, formatBudgetAmount, getNetAllocationTotal, normalizeAmount, percent, sumBudgetAmounts, summarizeBudgetItems, toNumber } from '../utils/budgetUtilizationCalculations';
import type { BudgetUtilizationAmount, BudgetUtilizationDashboardSummary, BudgetUtilizationItemWithAmount, BudgetUtilizationRawWorkbook, BudgetUtilizationReportPeriod } from '../types/budgetUtilization.types';
import { getSafeUserErrorMessage } from '../../../utils/errorHandling';
import { BudgetYearComparisonSection } from '../components/BudgetYearComparisonSection';

const chartColors = ['#2563eb', '#8b5cf6', '#f59e0b', '#0f766e', '#e11d48'];

const quarterColors = {
  q1: 'bg-emerald-100 text-emerald-950',
  q2: 'bg-yellow-100 text-yellow-950',
  q3: 'bg-orange-100 text-orange-950',
  q4: 'bg-sky-100 text-sky-950',
  total: 'bg-lime-100 text-lime-950',
};

type QuarterKey = 'q1' | 'q2' | 'q3' | 'q4';
type AssessmentGroupKey = 'overall' | 'recurrent' | 'investment';
type TargetTone = 'blue' | 'amber' | 'emerald';
type RawBudgetRow = {
  id: string;
  name: string;
  planned: number;
  allocation1: number;
  allocation2: number;
  allocation3: number;
  netTotal: number;
  centralIn: number;
  centralOut: number;
  departmentRequestIncrease: number;
  departmentTransferOut: number;
  divisionIn: number;
  divisionOut: number;
  committedPo: number;
  committedWithoutPo: number;
  committedTotal: number;
  disbursedGeneral: number;
  disbursedAdvance: number;
  disbursedTotal: number;
  utilizationTotal: number;
  remaining: number;
  disbursementRate: number;
  utilizationWithPoRate: number;
};

type ProjectPlanDetailRow = {
  id: string;
  sequenceLabel: string;
  name: string;
  output: string;
  activity: string;
  committedTotal: number;
  utilizationTotal: number;
  remaining: number;
  disbursedTotal: number;
  netTotal: number;
  disbursementRate: number;
  children: ProjectPlanDetailRow[];
};

const quarterOptions: Array<{ key: QuarterKey; label: string; period: string }> = [
  { key: 'q1', label: 'ไตรมาสที่ 1', period: '1 ต.ค. - 31 ธ.ค.' },
  { key: 'q2', label: 'ไตรมาสที่ 2', period: '1 ม.ค. - 31 มี.ค.' },
  { key: 'q3', label: 'ไตรมาสที่ 3', period: '1 เม.ย. - 30 มิ.ย.' },
  { key: 'q4', label: 'ไตรมาสที่ 4', period: '1 ก.ค. - 30 ก.ย.' },
];

const assessmentTargets: Record<AssessmentGroupKey, { label: string; q1: { spending: number; disbursement: number }; q2: { spending: number; disbursement: number }; q3: { spending: number; disbursement: number }; q4: { spending: number; disbursement: number }; total: { spending: number; disbursement: number } }> = {
  overall: {
    label: 'ภาพรวม',
    q1: { spending: 38, disbursement: 33 },
    q2: { spending: 61, disbursement: 55 },
    q3: { spending: 81, disbursement: 76 },
    q4: { spending: 100, disbursement: 93 },
    total: { spending: 100, disbursement: 93 },
  },
  recurrent: {
    label: 'รายจ่ายประจำ',
    q1: { spending: 38, disbursement: 37 },
    q2: { spending: 61, disbursement: 60 },
    q3: { spending: 84, disbursement: 83 },
    q4: { spending: 100, disbursement: 98 },
    total: { spending: 100, disbursement: 98 },
  },
  investment: {
    label: 'รายจ่ายลงทุน',
    q1: { spending: 36, disbursement: 20 },
    q2: { spending: 59, disbursement: 38 },
    q3: { spending: 69, disbursement: 55 },
    q4: { spending: 100, disbursement: 75 },
    total: { spending: 100, disbursement: 75 },
  },
};

const assessmentGroupOrder: AssessmentGroupKey[] = ['overall', 'recurrent', 'investment'];
const targetToneByGroup: Record<AssessmentGroupKey, TargetTone> = {
  overall: 'blue',
  recurrent: 'amber',
  investment: 'emerald',
};

const plannedBudgetCategoryDefinitions = [
  { key: "personnel", label: "งบบุคลากร", matcher: /งบบุคลากร/, color: "#2563eb" },
  { key: "investment", label: "งบลงทุน", matcher: /งบลงทุน/, color: "#f59e0b" },
  { key: "operations_total", label: "งบดำเนินงาน", matcher: /งบดำเนินงาน\(รวม\)/, color: "#0f766e" },
  { key: "operations", label: "งบดำเนินงาน (ดำเนินงานปกติ)", matcher: /^งบดำเนินงาน$/, color: "#0d9488" },
  { key: "project", label: "งบโครงการ (รวม)", matcher: /งบโครงการ/, color: "#8b5cf6" },
];

function formatExactBaht(value: number) {
  return `${formatBudgetAmount(value, Number.isInteger(value) ? 0 : 2)} บาท`;
}

function isProjectBudgetCategory(name: string) {
  return /งบโครงการ/.test(name);
}

function getProjectRootSequence(values: unknown[]) {
  for (const value of values) {
    const match = String(value ?? '').trim().match(/^3\.(5|6)(?=\s|$)/);
    if (match) return match[0];
  }
  return '';
}

function StatCard({ title, value, subtext = '', icon: Icon, tone }: { title: string; value: string; subtext?: string; icon: typeof Coins; tone: string }) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-2 break-words text-2xl font-semibold text-slate-950">{value}</p>
          {subtext ? <p className="mt-1 text-xs text-slate-500">{subtext}</p> : null}
        </div>
        <span className={`rounded-md p-2 ring-1 ${tone}`}>
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
      </div>
    </div>
  );
}

function TargetCard({ title, value, target, tone = 'blue' }: { title: string; value: number; target: number; tone?: TargetTone }) {
  const capped = Math.max(0, Math.min(100, value));
  const reached = value >= target;
  const toneClass = {
    blue: {
      border: 'border-blue-100',
      bar: 'bg-blue-600',
      target: reached ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700',
    },
    amber: {
      border: 'border-amber-100',
      bar: 'bg-amber-500',
      target: reached ? 'bg-amber-50 text-amber-700' : 'bg-orange-50 text-orange-700',
    },
    emerald: {
      border: 'border-emerald-100',
      bar: 'bg-emerald-600',
      target: reached ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700',
    },
  }[tone];

  return (
    <div className={`rounded-md border bg-white p-4 shadow-sm ${toneClass.border}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">{title}</p>
          <p className="mt-1 text-2xl font-bold text-slate-950">{formatBudgetAmount(value)}%</p>
        </div>
        <span className={`rounded-md px-2 py-1 text-xs font-semibold ${toneClass.target}`}>
          เป้าหมาย {target}%
        </span>
      </div>
      <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full ${toneClass.bar}`} style={{ width: `${capped}%` }} />
      </div>
    </div>
  );
}

function getDashboardAmountMetrics(amount: BudgetUtilizationAmount) {
  const netAllocationTotal = getNetAllocationTotal(amount);
  const remaining = Math.max(0, netAllocationTotal - amount.utilization_total_amount);

  return {
    netAllocationTotal,
    disbursementRate: percent(amount.disbursed_total_amount, netAllocationTotal),
    utilizationRate: percent(amount.utilization_total_amount, netAllocationTotal),
    remaining,
  };
}

function formatThaiDataUpdate(value: string | null | undefined) {
  if (!value) return 'ยังไม่มีข้อมูลเวลาอัปเดต';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'ยังไม่มีข้อมูลเวลาอัปเดต';

  const dateText = new Intl.DateTimeFormat('th-TH-u-ca-buddhist', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Bangkok',
  }).format(date);
  const timeText = new Intl.DateTimeFormat('th-TH', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Bangkok',
  }).format(date);

  return `อัปเดตข้อมูลล่าสุด ${dateText} เวลา ${timeText} น.`;
}

const hierarchyAmountFields = [
  'planned_budget_amount',
  'allocation_tranche_1_amount',
  'allocation_tranche_2_amount',
  'allocation_tranche_3_amount',
  'allocation_total_amount',
  'central_transfer_in_amount',
  'central_transfer_out_amount',
  'department_request_increase_amount',
  'department_transfer_out_amount',
  'division_transfer_in_amount',
  'division_transfer_out_amount',
  'committed_po_amount',
  'committed_without_po_amount',
  'committed_total_amount',
  'disbursed_general_amount',
  'disbursed_advance_amount',
  'disbursed_total_amount',
  'utilization_total_amount',
] as const;

function getCategoryAmount(category: BudgetUtilizationItemWithAmount, items: BudgetUtilizationItemWithAmount[]) {
  const descendantIds = new Set([category.id]);
  let hasChange = true;

  while (hasChange) {
    hasChange = false;
    for (const item of items) {
      if (item.parent_id && descendantIds.has(item.parent_id) && !descendantIds.has(item.id)) {
        descendantIds.add(item.id);
        hasChange = true;
      }
    }
  }

  const descendants = items.filter((item) => descendantIds.has(item.id) && item.id !== category.id);
  const itemById = new Map(items.map((item) => [item.id, item]));
  const aggregatedAmount = Object.fromEntries(hierarchyAmountFields.map((field) => {
    const categoryValue = toNumber(category.amount[field]);
    if (categoryValue !== 0) return [field, categoryValue];

    const value = descendants.reduce((total, item) => {
      const itemValue = toNumber(item.amount[field]);
      if (itemValue === 0) return total;

      let parentId = item.parent_id;
      while (parentId && parentId !== category.id) {
        const parent = itemById.get(parentId);
        if (!parent) break;
        if (toNumber(parent.amount[field]) !== 0) return total;
        parentId = parent.parent_id;
      }

      return total + itemValue;
    }, 0);

    return [field, value];
  })) as Partial<BudgetUtilizationAmount>;

  return normalizeAmount(aggregatedAmount);
}

function isInvestmentCategory(name: string) {
  return /ลงทุน/.test(name);
}

function getActualByGroup(group: AssessmentGroupKey, totals: BudgetUtilizationAmount, categoryData: Array<{ name: string; amount: BudgetUtilizationAmount }>) {
  if (group === 'overall') {
    return getDashboardAmountMetrics(totals);
  }

  const categoryAmounts = categoryData
    .filter((item) => (group === 'investment' ? isInvestmentCategory(item.name) : !isInvestmentCategory(item.name)))
    .map((item) => item.amount);

  return getDashboardAmountMetrics(sumBudgetAmounts(categoryAmounts));
}

function getRawCell(row: string[], index: number) {
  return String(row[index] ?? '').trim();
}

function rawWorkbookHasDepartmentTransfers(rawWorkbook: BudgetUtilizationRawWorkbook) {
  return rawWorkbook.rows.slice(0, 4).some((row) => (
    row.some((cell) => String(cell ?? '').replace(/\s+/g, '').includes('ภายในกรม'))
  ));
}

function mapRawBudgetRow(row: string[], index: number, hasDepartmentColumns = false): RawBudgetRow {
  const transferOffset = hasDepartmentColumns ? 2 : 0;
  const summaryLabel = getRawCell(row, 0);
  const name = (/\(รวม\)/.test(summaryLabel) || summaryLabel === 'งบดำเนินงาน')
    ? summaryLabel
    : getRawCell(row, 5) || getRawCell(row, 1) || summaryLabel || `แถวที่ ${index + 1}`;
  const netTotal = toNumber(row[12]);
  const committedTotal = toNumber(row[19 + transferOffset]) || toNumber(row[17 + transferOffset]) + toNumber(row[18 + transferOffset]);
  const disbursedTotal = toNumber(row[22 + transferOffset]) || toNumber(row[20 + transferOffset]) + toNumber(row[21 + transferOffset]);
  const utilizationTotal = toNumber(row[23 + transferOffset]) || committedTotal + disbursedTotal;
  const remaining = toNumber(row[24 + transferOffset]) || (netTotal - utilizationTotal);

  return {
    id: `raw-${index}`,
    name,
    planned: toNumber(row[8]),
    allocation1: toNumber(row[9]),
    allocation2: toNumber(row[10]),
    allocation3: toNumber(row[11]),
    netTotal,
    centralIn: toNumber(row[13]),
    centralOut: toNumber(row[14]),
    departmentRequestIncrease: hasDepartmentColumns ? toNumber(row[15]) : 0,
    departmentTransferOut: hasDepartmentColumns ? toNumber(row[16]) : 0,
    divisionIn: toNumber(row[15 + transferOffset]),
    divisionOut: toNumber(row[16 + transferOffset]),
    committedPo: toNumber(row[17 + transferOffset]),
    committedWithoutPo: toNumber(row[18 + transferOffset]),
    committedTotal,
    disbursedGeneral: toNumber(row[20 + transferOffset]),
    disbursedAdvance: toNumber(row[21 + transferOffset]),
    disbursedTotal,
    utilizationTotal,
    remaining,
    disbursementRate: percent(disbursedTotal, netTotal),
    utilizationWithPoRate: percent(utilizationTotal, netTotal),
  };
}

function getRawDashboardRows(rawWorkbook: BudgetUtilizationRawWorkbook | null | undefined) {
  if (!rawWorkbook) {
    return { total: null as RawBudgetRow | null, categories: [] as RawBudgetRow[] };
  }

  const hasDepartmentColumns = rawWorkbookHasDepartmentTransfers(rawWorkbook);
  const mappedRows = rawWorkbook.rows
    .map((row, index) => ({ row, mapped: mapRawBudgetRow(row, index, hasDepartmentColumns) }))
    .filter(({ mapped }) => mapped.netTotal || mapped.planned || mapped.disbursedTotal || mapped.utilizationTotal);
  const total = mappedRows.find(({ row }) => row.some((cell) => /รวมทั้งสิ้น/.test(cell)))?.mapped ?? mappedRows[0]?.mapped ?? null;
  const categories = mappedRows
    .filter(({ row }) => {
      const cell0 = getRawCell(row, 0);
      return (/\(รวม\)/.test(cell0) || cell0 === "งบดำเนินงาน") && !/รวมทั้งสิ้น/.test(cell0);
    })
    .map(({ mapped }) => mapped);

  return { total, categories };
}

function sumRawBudgetRows(rows: RawBudgetRow[]): RawBudgetRow {
  const sum = rows.reduce(
    (total, row) => ({
      planned: total.planned + row.planned,
      allocation1: total.allocation1 + row.allocation1,
      allocation2: total.allocation2 + row.allocation2,
      allocation3: total.allocation3 + row.allocation3,
      netTotal: total.netTotal + row.netTotal,
      centralIn: total.centralIn + row.centralIn,
      centralOut: total.centralOut + row.centralOut,
      departmentRequestIncrease: total.departmentRequestIncrease + row.departmentRequestIncrease,
      departmentTransferOut: total.departmentTransferOut + row.departmentTransferOut,
      divisionIn: total.divisionIn + row.divisionIn,
      divisionOut: total.divisionOut + row.divisionOut,
      committedPo: total.committedPo + row.committedPo,
      committedWithoutPo: total.committedWithoutPo + row.committedWithoutPo,
      committedTotal: total.committedTotal + row.committedTotal,
      disbursedGeneral: total.disbursedGeneral + row.disbursedGeneral,
      disbursedAdvance: total.disbursedAdvance + row.disbursedAdvance,
      disbursedTotal: total.disbursedTotal + row.disbursedTotal,
      utilizationTotal: total.utilizationTotal + row.utilizationTotal,
      remaining: total.remaining + row.remaining,
    }),
    {
      planned: 0,
      allocation1: 0,
      allocation2: 0,
      allocation3: 0,
      netTotal: 0,
      centralIn: 0,
      centralOut: 0,
      departmentRequestIncrease: 0,
      departmentTransferOut: 0,
      divisionIn: 0,
      divisionOut: 0,
      committedPo: 0,
      committedWithoutPo: 0,
      committedTotal: 0,
      disbursedGeneral: 0,
      disbursedAdvance: 0,
      disbursedTotal: 0,
      utilizationTotal: 0,
      remaining: 0,
    },
  );

  return {
    id: 'raw-sum',
    name: 'รวม',
    ...sum,
    disbursementRate: percent(sum.disbursedTotal, sum.netTotal),
    utilizationWithPoRate: percent(sum.utilizationTotal, sum.netTotal),
  };
}

function getRawPlanCategoryData(categories: RawBudgetRow[]) {
  return plannedBudgetCategoryDefinitions.map((definition) => {
    const rows = categories.filter((category) => definition.matcher.test(category.name));
    const totals = sumRawBudgetRows(rows);

    return {
      ...totals,
      key: definition.key,
      name: definition.label,
      color: definition.color,
      planned: rows.reduce((sum, category) => sum + category.planned, 0),
    };
  });
}

function getRawPlanDetailRows(rawWorkbook: BudgetUtilizationRawWorkbook | null | undefined, categoryKey: string) {
  if (!rawWorkbook) return [];

  const definition = plannedBudgetCategoryDefinitions.find((item) => item.key === categoryKey);
  if (!definition) return [];

  const hasDepartmentColumns = rawWorkbookHasDepartmentTransfers(rawWorkbook);
  const detailRows = rawWorkbook.rows
    .map((row, index) => ({ row, mapped: mapRawBudgetRow(row, index, hasDepartmentColumns) }))
    .filter(({ row, mapped }) => {
      const rowLabel = getRawCell(row, 0);
      const categoryName = getRawCell(row, 2);
      const itemName = getRawCell(row, 5);
      const rawProjectCell = row.find((cell) => /โครงการใหญ่\s*:/.test(String(cell ?? '')));
      const projectName = rawProjectCell ? String(rawProjectCell).trim() : '';
      const isProjectRow = categoryKey === 'project' && (
        Boolean(projectName)
        || /โครงการใหญ่/.test(rowLabel)
        || /โครงการใหญ่/.test(itemName)
      );

      if (categoryKey === 'project') {
        return isProjectRow && !/\(รวม\)|รวมทั้งสิ้น/.test(itemName);
      }

      const hasMoney = mapped.planned || mapped.netTotal || mapped.utilizationTotal || mapped.remaining || mapped.disbursedTotal;

      if (
        !definition.matcher.test(categoryName)
        || /\(รวม\)|รวมทั้งสิ้น|ดึงมา/.test(rowLabel)
        || /\(รวม\)|ดึงมา/.test(categoryName)
        || !itemName
        || !hasMoney
      ) {
        return false;
      }

      if (
        categoryKey === 'operations'
        && itemName.replace(/\s+/g, '') === categoryName.replace(/\s+/g, '')
      ) {
        return false;
      }

      return true;
    })
    .map(({ row, mapped }) => ({
      ...mapped,
      name: categoryKey === 'project'
        ? String(row.find((cell) => /โครงการใหญ่\s*:/.test(String(cell ?? ''))) || getRawCell(row, 5) || mapped.name).trim()
        : categoryKey === 'personnel'
          ? mapped.name.replace(/^\s*งบบุคลากร\s*:\s*/, '')
          : mapped.name,
      output: getRawCell(row, 3),
      activity: getRawCell(row, 4),
    }));

  return detailRows;
}

function getRawActualByGroup(group: AssessmentGroupKey, total: RawBudgetRow | null, categories: RawBudgetRow[]) {
  if (!total) return null;
  if (group === 'overall') {
    return total;
  }

  const groupCategories = categories.filter((item) => (group === 'investment' ? isInvestmentCategory(item.name) : !isInvestmentCategory(item.name)));
  return sumRawBudgetRows(groupCategories);
}

function buildDatabaseWorkbook(summary: BudgetUtilizationDashboardSummary | null): BudgetUtilizationRawWorkbook | null {
  if (!summary?.reportPeriod || summary.items.length === 0) return null;

  const toRow = (
    firstCell: string,
    categoryName: string,
    itemName: string,
    amount: BudgetUtilizationAmount,
    output = '',
    activity = '',
  ) => {
    const netTotal = getNetAllocationTotal(amount);
    const remaining = Math.max(0, netTotal - amount.utilization_total_amount);
    const row = Array.from({ length: 29 }, () => '');
    row[0] = firstCell;
    row[2] = categoryName;
    row[3] = output;
    row[4] = activity;
    row[5] = itemName;
    row[8] = String(amount.planned_budget_amount);
    row[9] = String(amount.allocation_tranche_1_amount);
    row[10] = String(amount.allocation_tranche_2_amount);
    row[11] = String(amount.allocation_tranche_3_amount);
    row[12] = String(netTotal);
    row[13] = String(amount.central_transfer_in_amount);
    row[14] = String(amount.central_transfer_out_amount);
    row[15] = String(amount.department_request_increase_amount);
    row[16] = String(amount.department_transfer_out_amount);
    row[17] = String(amount.division_transfer_in_amount);
    row[18] = String(amount.division_transfer_out_amount);
    row[19] = String(amount.committed_po_amount);
    row[20] = String(amount.committed_without_po_amount);
    row[21] = String(amount.committed_total_amount);
    row[22] = String(amount.disbursed_general_amount);
    row[23] = String(amount.disbursed_advance_amount);
    row[24] = String(amount.disbursed_total_amount);
    row[25] = String(amount.utilization_total_amount);
    row[26] = String(remaining);
    row[27] = String(percent(amount.disbursed_total_amount, netTotal));
    row[28] = String(percent(amount.utilization_total_amount, netTotal));
    return row;
  };

  const rows: string[][] = [
    ['รายการ', '', 'หมวดงบประมาณ', 'ผลผลิต', 'กิจกรรมหลัก', 'ชื่อโครงการ', '', '', 'วงเงินตามแผน', 'รับจัดสรรงวด 1', 'รับจัดสรรงวด 2', 'รับจัดสรรงวด 3', 'ยอดสุทธิ', 'ส่วนกลางรับโอน', 'ส่วนกลางโอนออก', 'ภายในกรมขอเพิ่ม', 'ภายในกรมโอนออก', 'ภายในกองรับโอน', 'ภายในกองโอนออก', 'มี PO', 'ไม่มี PO', 'ผูกพันรวม', 'เบิกจ่ายทั่วไป', 'เงินยืมราชการ', 'เบิกจ่ายรวม', 'รวม', 'คงเหลือ', 'ร้อยละเบิกจ่าย', 'ร้อยละรวม'],
    toRow('รวมทั้งสิ้น', '', 'รวมทั้งสิ้น', summary.totals),
  ];
  const itemById = new Map(summary.items.map((item) => [item.id, item]));
  const categoryByItemId = new Map<string, BudgetUtilizationItemWithAmount>();
  const findCategory = (item: BudgetUtilizationItemWithAmount) => {
    if (categoryByItemId.has(item.id)) return categoryByItemId.get(item.id) ?? null;
    let current: BudgetUtilizationItemWithAmount | null = item;
    while (current && current.row_type !== 'budget_category') {
      current = current.parent_id ? itemById.get(current.parent_id) ?? null : null;
    }
    if (current) categoryByItemId.set(item.id, current);
    return current;
  };
  const isProjectItem = (item: BudgetUtilizationItemWithAmount) => {
    let current: BudgetUtilizationItemWithAmount | null = item;
    while (current) {
      if (current.row_type === 'major_project' || /โครงการใหญ่/.test(current.item_name)) return true;
      current = current.parent_id ? itemById.get(current.parent_id) ?? null : null;
    }
    return false;
  };
  const isDescendantOf = (item: BudgetUtilizationItemWithAmount, ancestorId: string) => {
    let parentId = item.parent_id;
    while (parentId) {
      if (parentId === ancestorId) return true;
      parentId = itemById.get(parentId)?.parent_id ?? null;
    }
    return false;
  };
  const orderedCategories = [...summary.categoryItems].sort((a, b) => a.sort_order - b.sort_order);
  const findTableCategory = (item: BudgetUtilizationItemWithAmount) => (
    findCategory(item)
    ?? [...orderedCategories].reverse().find((category) => category.sort_order < item.sort_order)
    ?? null
  );
  const operationsCategories = orderedCategories.filter((category) => (
    category.item_name.replace(/\s+/g, '').includes('งบดำเนินงาน')
  ));
  const majorProjects = summary.items.filter((item) => item.row_type === 'major_project');

  const rollupMap = buildHierarchyRollupMap(summary.items);
  const categoryAmounts = summary.categoryItems.map((category) => {
    const rolledAmount = rollupMap.get(category.id) ?? getCategoryAmount(category, summary.items);
    return {
      category,
      amount: rolledAmount,
    };
  });
  const grandTotal = summarizeBudgetItems(summary.items);
  rows[1] = toRow('รวมทั้งสิ้น', '', 'รวมทั้งสิ้น', grandTotal);

  for (const { category, amount: categoryAmount } of categoryAmounts) {
    const compactName = category.item_name.replace(/\s+/g, '');
    const categoryTotalLabel = compactName.includes('งบดำเนินงาน')
      ? 'งบดำเนินงาน(รวม)'
      : `${category.item_name} (รวม)`;
    rows.push(toRow(categoryTotalLabel, category.item_name, category.item_name, categoryAmount));
  }

  const detailItems = summary.items.filter((item) => (
    item.row_type !== 'total'
    && item.row_type !== 'budget_category'
    && !summary.items.some((candidate) => candidate.parent_id === item.id)
  ));
  const operationsDetails = detailItems.filter((item) => /งบดำเนินงาน/.test(findCategory(item)?.item_name ?? ''));
  const regularOperations = operationsDetails.filter((item) => !isProjectItem(item));
  const projectOperations = operationsDetails.filter(isProjectItem);
  const majorProjectAmounts = majorProjects.map((item) => rollupMap.get(item.id) ?? getCategoryAmount(item, summary.items));
  if (regularOperations.length > 0) {
    rows.push(toRow('งบดำเนินงาน', 'งบดำเนินงาน', 'งบดำเนินงาน', sumBudgetAmounts(regularOperations.map((item) => rollupMap.get(item.id) ?? item.amount))));
  }
  if (majorProjectAmounts.length > 0 || projectOperations.length > 0) {
    const projectAmount = majorProjectAmounts.length > 0
      ? sumBudgetAmounts(majorProjectAmounts)
      : sumBudgetAmounts(projectOperations.map((item) => rollupMap.get(item.id) ?? item.amount));
    rows.push(toRow('งบโครงการ (รวม)', 'งบโครงการ', 'งบโครงการ (รวม)', projectAmount));
  }

  for (const proj of majorProjects) {
    const projAmount = rollupMap.get(proj.id) ?? getCategoryAmount(proj, summary.items);
    rows.push(toRow(
      proj.sequence_label ?? '',
      'งบโครงการ',
      `โครงการใหญ่ : ${proj.item_name.replace(/^โครงการใหญ่\s*:\s*/, '')}`,
      projAmount,
      proj.output_label ?? '',
      proj.activity_label ?? proj.activity_sequence_label ?? '',
    ));
  }

  for (const item of detailItems) {
    const category = findCategory(item);
    const categoryName = /งบดำเนินงาน/.test(category?.item_name ?? '')
      ? isProjectItem(item) ? 'งบโครงการ' : 'งบดำเนินงาน'
      : category?.item_name ?? '';
    rows.push(toRow(
      item.sequence_label ?? '',
      categoryName,
      item.item_name,
      item.amount,
      item.output_label ?? '',
      item.activity_label ?? item.activity_sequence_label ?? '',
    ));
  }

  return {
    sheetName: 'ฐานข้อมูลงบประมาณปัจจุบัน',
    columnCount: 29,
    rows,
    merges: [],
  };
}

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

  const totals = summary?.totals ?? null;
  const selectableReportPeriods = useMemo(() => reportPeriods.filter((period, index, periods) => (
    periods.findIndex((candidate) => candidate.fiscal_year === period.fiscal_year) === index
  )), [reportPeriods]);
  const databaseWorkbook = useMemo(() => buildDatabaseWorkbook(summary), [summary]);
  const rawWorkbook = databaseWorkbook;
  const rawDashboard = useMemo(() => getRawDashboardRows(rawWorkbook), [rawWorkbook]);
  const rawTotal = rawDashboard.total;
  const rawCategoryData = rawDashboard.categories;

  const rawPlanCategoryData = useMemo(() => getRawPlanCategoryData(rawCategoryData), [rawCategoryData]);

  const visiblePlanCategoryData = useMemo(() => {
    const keys = ["personnel", "investment", "operations_total"];
    if (showProjectBar) {
      keys.push("project");
    }

    const visibleCategories = rawPlanCategoryData.filter((item) => keys.includes(item.key));
    if (!showProjectBar || !showBottomTable) return visibleCategories;

    const projectCategory = rawPlanCategoryData.find((item) => item.key === "project");
    if (!projectCategory) return visibleCategories;

    return visibleCategories.map((item) => {
      if (item.key !== "operations_total") return item;

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

  const visiblePlanChartData = useMemo(() => visiblePlanCategoryData.map((item) => {
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
  }), [visiblePlanCategoryData]);

  const selectedRawPlanCategory = rawPlanCategoryData.find((item) => item.key === selectedRawPlanCategoryKey) ?? rawPlanCategoryData[0] ?? rawTotal;
  const selectedRawPlanDetailRows = useMemo(() => {
    const keyToFetch = selectedRawPlanCategoryKey === "operations_total" ? "operations" : selectedRawPlanCategoryKey;
    return getRawPlanDetailRows(rawWorkbook, keyToFetch);
  }, [rawWorkbook, selectedRawPlanCategoryKey]);

  const selectedPlanStats = useMemo(() => {
    const fallback = { netTotal: rawTotal?.netTotal ?? 0, disbursedTotal: rawTotal?.disbursedTotal ?? 0, remaining: rawTotal?.remaining ?? 0, disbursementRate: rawTotal?.disbursementRate ?? 0 };
    if (!hasPlanBarClicked) return fallback;
    const activeKey = showBottomTable ? "project" : selectedRawPlanCategoryKey;
    const categorySource = showBottomTable ? visiblePlanCategoryData : rawPlanCategoryData;
    const cat = categorySource.find((item) => item.key === activeKey);
    if (!cat) return fallback;
    return {
      netTotal: cat.netTotal,
      disbursedTotal: cat.disbursedTotal,
      remaining: cat.remaining,
      disbursementRate: cat.disbursementRate,
    };
  }, [hasPlanBarClicked, showBottomTable, showProjectBar, selectedRawPlanCategoryKey, rawPlanCategoryData, rawTotal, visiblePlanCategoryData]);

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
    childrenByParent.forEach((children) => children.sort((left, right) => (
      (left.sequence_label ?? '').localeCompare(right.sequence_label ?? '', 'th', { numeric: true })
      || left.sort_order - right.sort_order
    )));

    const toProjectDetailRow = (item: BudgetUtilizationItemWithAmount, ancestorIds = new Set<string>()): ProjectPlanDetailRow => {
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
    const normalizedProjectRoots = ['3.5', '3.6'].map((rootSequence) => (
      normalizedItems
        .filter((item) => getProjectRootSequence([
          item.sequence_label,
          item.raw_label,
          ...(item.source_row_data ?? []),
        ]) === rootSequence)
        .sort((left, right) => left.depth - right.depth || left.sort_order - right.sort_order)[0]
    )).filter((item): item is BudgetUtilizationItemWithAmount => Boolean(item));
    const normalizedProjects = normalizedProjectRoots.map((item) => toProjectDetailRow(item));

    if (normalizedProjects.length > 0) return normalizedProjects;
    return getRawPlanDetailRows(rawWorkbook, "project").map<ProjectPlanDetailRow>((item) => ({
      ...item,
      sequenceLabel: '',
      children: [],
    }));
  }, [rawWorkbook, summary?.items]);

  const rawAssessmentRows = useMemo(() => assessmentGroupOrder.map((group) => {
    const actual = getRawActualByGroup(group, rawTotal, rawCategoryData);
    const target = assessmentTargets[group][selectedQuarter];

    return {
      group,
      label: assessmentTargets[group].label,
      target,
      actualSpending: actual?.utilizationWithPoRate ?? 0,
      actualDisbursement: actual?.disbursementRate ?? 0,
    };
  }), [rawCategoryData, rawTotal, selectedQuarter]);
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
    const leafAllocationSource = summary.items.filter((item) => (
      item.row_type !== 'total' && !childItemIds.has(item.id)
    ));

    return summary.allocationTranches.map((tranche) => ({
      name: tranche.label,
      value: leafAllocationSource.some((item) => item.allocations?.some((allocation) => allocation.tranche_id === tranche.id))
        ? leafAllocationSource.reduce((total, item) => (
            total + (item.allocations?.find((allocation) => allocation.tranche_id === tranche.id)?.amount ?? 0)
          ), 0)
        : summary.totalItem?.allocations?.find((allocation) => allocation.tranche_id === tranche.id)?.amount ?? 0,
    })).filter((item) => item.value > 0);
  }, [rawTotal, summary]);
  const dashboardMetrics = totals ? getDashboardAmountMetrics(totals) : null;
  const allocationData = useMemo(() => [
    { name: 'รับจัดสรร(งวด 1)', value: totals?.allocation_tranche_1_amount ?? 0 },
    { name: 'รับจัดสรร(งวด 2)', value: totals?.allocation_tranche_2_amount ?? 0 },
    { name: 'รับจัดสรร(งวด 3)', value: totals?.allocation_tranche_3_amount ?? 0 },
  ].filter((item) => item.value > 0), [totals]);

  const categoryData = useMemo(() => (summary?.categoryItems ?? []).map((item) => {
    const amount = getCategoryAmount(item, summary?.items ?? []);
    const budget = getNetAllocationTotal(amount);

    return {
      ...getDashboardAmountMetrics(amount),
      id: item.id,
      name: item.item_name,
      budget,
      disbursed: amount.disbursed_total_amount,
      rate: percent(amount.disbursed_total_amount, budget),
      amount,
    };
  }), [summary]);

  const dbPersonnelPlanned = useMemo(() => categoryData.find(item => /บุคลากร/.test(item.name))?.amount.planned_budget_amount ?? 0, [categoryData]);
  const dbInvestmentPlanned = useMemo(() => categoryData.find(item => /ลงทุน/.test(item.name))?.amount.planned_budget_amount ?? 0, [categoryData]);
  const dbOperationsPlanned = useMemo(() => categoryData.find(item => /ดำเนินงาน/.test(item.name))?.amount.planned_budget_amount ?? 0, [categoryData]);
  const dbPlannedTotal = useMemo(() => dbPersonnelPlanned + dbInvestmentPlanned + dbOperationsPlanned, [dbPersonnelPlanned, dbInvestmentPlanned, dbOperationsPlanned]);
  const assessmentRows = useMemo(() => assessmentGroupOrder.map((group) => {
    const actual = totals ? getActualByGroup(group, totals, categoryData) : null;
    const target = assessmentTargets[group][selectedQuarter];

    return {
      group,
      label: assessmentTargets[group].label,
      target,
      actualSpending: actual?.utilizationRate ?? 0,
      actualDisbursement: actual?.disbursementRate ?? 0,
    };
  }), [categoryData, selectedQuarter, totals]);

  const hasData = Boolean((summary?.reportPeriod && totals) || rawTotal);

  const toggleProjectExpansion = (projectId: string) => {
    setExpandedProjectIds((current) => (
      current.includes(projectId)
        ? current.filter((id) => id !== projectId)
        : [...current, projectId]
    ));
  };

  const renderProjectHierarchyRows = (items: ProjectPlanDetailRow[], depth = 0): ReactNode[] => (
    items.flatMap((item) => {
      const isExpanded = expandedProjectIds.includes(item.id);
      const hasChildren = item.children.length > 0;
      const rowBackground = depth === 0 ? 'bg-white' : depth % 2 === 1 ? 'bg-sky-50/70' : 'bg-slate-50';
      const row = (
        <tr key={item.id} className={rowBackground}>
          <td className="w-[55%] max-w-0 py-3 pr-4 font-medium text-slate-900" style={{ paddingLeft: `${16 + depth * 28}px` }}>
            <button
              type="button"
              onClick={() => toggleProjectExpansion(item.id)}
              disabled={!hasChildren}
              aria-expanded={hasChildren ? isExpanded : undefined}
              className="flex w-full items-start gap-2 rounded-md text-left transition hover:bg-sky-100/70 focus:outline-none focus:ring-2 focus:ring-sky-200 disabled:cursor-default disabled:hover:bg-transparent"
            >
              <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center text-sky-700">
                {hasChildren ? (isExpanded ? <ChevronDown className="h-4 w-4" aria-hidden="true" /> : <ChevronRight className="h-4 w-4" aria-hidden="true" />) : null}
              </span>
              <span className="min-w-0">
                <span className={`line-clamp-2 text-slate-950 ${depth === 0 ? 'font-semibold' : 'font-medium'}`}>{item.sequenceLabel ? `${item.sequenceLabel} ` : ''}{item.name}</span>
                <span className="mt-1 block text-xs font-normal text-slate-500">
                  ผลผลิตที่ {item.output || '-'} · กิจกรรมหลักที่ {item.activity || '-'}
                  {hasChildren ? ` · ${item.children.length} รายการย่อย` : ''}
                </span>
              </span>
            </button>
          </td>
          <td className={`w-[15%] px-4 py-3 text-right text-slate-950 ${depth === 0 ? 'font-semibold' : 'font-medium'}`}>{formatBudgetAmount(item.utilizationTotal)}</td>
          <td className={`w-[15%] px-4 py-3 text-right text-slate-950 ${depth === 0 ? 'font-semibold' : 'font-medium'}`}>{formatBudgetAmount(item.remaining)}</td>
          <td className={`w-[15%] px-4 py-3 text-right text-teal-700 ${depth === 0 ? 'font-semibold' : 'font-medium'}`}>{formatBudgetAmount(item.disbursementRate)}%</td>
        </tr>
      );

      return isExpanded
        ? [row, ...renderProjectHierarchyRows(item.children, depth + 1)]
        : [row];
    })
  );

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
          description={summary?.reportPeriod
            ? `${summary.reportPeriod.department_name} · ปีงบประมาณ ${summary.reportPeriod.fiscal_year}`
            : 'กองยุทธศาสตร์และแผนงาน'}
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
                  ปีงบประมาณ {period.fiscal_year}{period.is_active ? ' (ใช้งานอยู่)' : ''}
                </option>
              ))}
            </select>
          </label>
          <p className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 shadow-sm" aria-live="polite">
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
          <p className="mt-2 text-sm text-slate-600">ให้ผู้ดูแลระบบสร้างปีงบประมาณและกรอกรายการงบประมาณก่อน Dashboard จะแสดงผล</p>
        </div>
      ) : null}

      {rawWorkbook && rawTotal ? (
        <div className="space-y-5">
          <section className="grid items-start gap-4 xl:grid-cols-[250px_minmax(0,1fr)]">
            <div className="space-y-3">
              <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
                <h2 className="text-base font-semibold text-slate-950">วงเงินตามแผนปฏิบัติราชการ</h2>
                <div className="relative mt-3 h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'งบบุคลากร', value: rawPlanCategoryData.find(item => item.key === 'personnel')?.planned ?? 0 },
                          { name: 'งบลงทุน', value: rawPlanCategoryData.find(item => item.key === 'investment')?.planned ?? 0 },
                          { name: 'งบดำเนินงาน', value: rawPlanCategoryData.find(item => item.key === 'operations_total')?.planned ?? 0 },
                        ].filter((item) => item.value > 0)}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={58}
                        outerRadius={88}
                        paddingAngle={2}
                      >
                        {[
                          { key: 'personnel', color: '#2563eb' },
                          { key: 'investment', color: '#f59e0b' },
                          { key: 'operations_total', color: '#0f766e' },
                        ].filter(item => (rawPlanCategoryData.find(x => x.key === item.key)?.planned ?? 0) > 0).map((item, index) => (
                          <Cell key={index} fill={item.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => formatExactBaht(Number(value))} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-center">
                    <div className="max-w-[110px]">
                      <p className="text-[10px] font-semibold text-slate-500">วงเงินตามแผนรวม</p>
                      <p className="text-[16px] font-bold leading-none text-slate-950 my-0.5">
                        {formatBudgetAmount(
                          (rawPlanCategoryData.find(item => item.key === 'personnel')?.planned ?? 0) +
                          (rawPlanCategoryData.find(item => item.key === 'investment')?.planned ?? 0) +
                          (rawPlanCategoryData.find(item => item.key === 'operations_total')?.planned ?? 0)
                        )}
                      </p>
                      <p className="text-[10px] font-semibold text-slate-500">บาท</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  {[
                    { name: 'งบบุคลากร', value: rawPlanCategoryData.find(item => item.key === 'personnel')?.planned ?? 0 },
                    { name: 'งบลงทุน', value: rawPlanCategoryData.find(item => item.key === 'investment')?.planned ?? 0 },
                    { name: 'งบดำเนินงาน', value: rawPlanCategoryData.find(item => item.key === 'operations_total')?.planned ?? 0 },
                  ].map((item) => (
                    <div key={item.name} className="flex items-center justify-between gap-3 text-xs">
                      <span className="min-w-0 truncate text-slate-900">{item.name}</span>
                      <span className="shrink-0 font-semibold text-slate-950">{formatBudgetAmount(item.value, 0)} บาท</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
                <h2 className="text-base font-semibold text-slate-950">งบประมาณที่รับจัดสรร</h2>
                <div
                  className="relative mt-3 h-56 cursor-pointer rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2"
                  role="button"
                  tabIndex={0}
                  title="กลับสู่ภาพรวมงบประมาณที่รับจัดสรร"
                  aria-label="กลับสู่ภาพรวมงบประมาณที่รับจัดสรร"
                  onClick={handleAllocationOverviewClick}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      handleAllocationOverviewClick();
                    }
                  }}
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={displayedAllocationData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={58}
                        outerRadius={88}
                        paddingAngle={2}
                      >
                        {displayedAllocationData.map((_, index) => (
                          <Cell key={index} fill={chartColors[index % chartColors.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => formatExactBaht(Number(value))} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-center">
                    <div className="max-w-[110px]">
                      <p className="text-[10px] font-semibold text-slate-500">ยอดสุทธิภาพรวม</p>
                      <p className="text-[16px] font-bold leading-none text-slate-950 my-0.5">{formatBudgetAmount(rawTotal.netTotal)}</p>
                      <p className="text-[9px] font-semibold text-slate-500">บาท</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  {displayedAllocationData.map((item) => (
                    <div key={item.name} className="flex items-center justify-between gap-3 text-xs">
                      <span className="min-w-0 truncate text-slate-900">{item.name}</span>
                      <span className="shrink-0 font-semibold text-slate-950">{formatBudgetAmount(item.value, 0)} บาท</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            <div className="flex flex-col gap-4">
              <div className="order-1 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <StatCard title="ยอดรวมสุทธิ" value={formatExactBaht(selectedPlanStats.netTotal)} icon={Coins} tone="bg-blue-50 text-blue-700 ring-blue-100" />
                <StatCard title="เบิกจ่ายรวม" value={formatExactBaht(selectedPlanStats.disbursedTotal)} icon={WalletCards} tone="bg-emerald-50 text-emerald-700 ring-emerald-100" />
                <StatCard title="คงเหลือ" value={formatExactBaht(selectedPlanStats.remaining)} icon={BarChart3} tone="bg-slate-50 text-slate-700 ring-slate-200" />
                <StatCard title="ร้อยละเบิกจ่าย" value={`${formatBudgetAmount(selectedPlanStats.disbursementRate)}%`} icon={TrendingUp} tone="bg-amber-50 text-amber-700 ring-amber-100" />
              </div>

              <div className="order-2 rounded-md border border-slate-200 bg-white p-4 shadow-sm">
                <h2 className="text-base font-bold text-slate-950">เปรียบเทียบงบประมาณที่รับจัดสรร ผลเบิกจ่ายรวม และคงเหลือ</h2>
                <div className="mt-4 grid items-start gap-4 xl:grid-cols-[minmax(540px,0.9fr)_minmax(520px,1fr)]">
                  <div>
                    <div className="h-96 xl:h-[500px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={visiblePlanChartData} margin={{ bottom: 16, left: 18, right: 12, top: 28 }} barGap={4}>
                          <CartesianGrid stroke="#cbd5e1" strokeDasharray="3 4" vertical={false} />
                          <XAxis dataKey="name" tick={{ fontSize: 15, fontWeight: 400, fill: '#334155' }} interval={0} angle={-8} textAnchor="end" height={48} />
                          <YAxis tick={{ fontSize: 14, fontWeight: 400, fill: '#64748b' }} tickFormatter={(value) => `${Number(value) / 1_000_000}ล.`} />
                          <Tooltip formatter={(value) => formatExactBaht(Number(value))} />
                          <Legend verticalAlign="bottom" iconType="square" wrapperStyle={{ color: '#334155', fontSize: 14, fontWeight: 400, paddingTop: 8 }} />
                          <Bar dataKey="allocatedBudget" name="งบประมาณที่รับจัดสรร" fill="#1d4ed8" radius={[5, 5, 0, 0]} animationDuration={450}>
                            {visiblePlanChartData.map((item) => {
                              const isActive = showBottomTable
                                ? item.key === "project"
                                : item.key === selectedRawPlanCategoryKey;

                              return (
                                <Cell
                                  key={item.key}
                                  fill="#1d4ed8"
                                  fillOpacity={isActive ? 1 : 0.58}
                                  stroke={isActive ? "#172554" : "#1d4ed8"}
                                  strokeWidth={isActive ? 2 : 1}
                                  className="cursor-pointer"
                                  onClick={() => handlePlanCategoryClick(item.key)}
                                />
                              );
                            })}
                          </Bar>
                          <Bar dataKey="disbursedTotal" name="ผลเบิกจ่ายรวม" fill="#ea580c" radius={[5, 5, 0, 0]} animationDuration={450}>
                            {visiblePlanChartData.map((item) => {
                              const isActive = showBottomTable
                                ? item.key === "project"
                                : item.key === selectedRawPlanCategoryKey;

                              return (
                                <Cell
                                  key={item.key}
                                  fill="#ea580c"
                                  fillOpacity={isActive ? 1 : 0.58}
                                  stroke={isActive ? "#7c2d12" : "#ea580c"}
                                  strokeWidth={isActive ? 2 : 1}
                                  className="cursor-pointer"
                                  onClick={() => handlePlanCategoryClick(item.key)}
                                />
                              );
                            })}
                            <LabelList
                              dataKey="disbursementRateLabel"
                              position="top"
                              fill="#9a3412"
                              fontSize={13}
                              fontWeight="normal"
                              stroke="none"
                              strokeWidth={0}
                              style={{ fontWeight: 400 }}
                            />
                          </Bar>
                          <Bar dataKey="remainingFromAllocation" name="คงเหลือ" fill="#0f766e" radius={[5, 5, 0, 0]} animationDuration={450}>
                            {visiblePlanChartData.map((item) => {
                              const isActive = showBottomTable
                                ? item.key === "project"
                                : item.key === selectedRawPlanCategoryKey;

                              return (
                                <Cell
                                  key={item.key}
                                  fill="#0f766e"
                                  fillOpacity={isActive ? 1 : 0.58}
                                  stroke={isActive ? "#134e4a" : "#0f766e"}
                                  strokeWidth={isActive ? 2 : 1}
                                  className="cursor-pointer"
                                  onClick={() => handlePlanCategoryClick(item.key)}
                                />
                              );
                            })}
                            <LabelList
                              dataKey="remainingFromAllocationLabel"
                              position="top"
                              fill="#115e59"
                              fontSize={13}
                              fontWeight="normal"
                              stroke="none"
                              strokeWidth={0}
                              style={{ fontWeight: 400 }}
                            />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="flex flex-col gap-4">
                    <div className="rounded-md border border-slate-200 bg-slate-50 shadow-sm">
                      <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-3 py-2">
                        <h3 className="text-sm font-bold text-slate-950">
                          {selectedRawPlanCategoryKey === "operations_total" ? "รายการงบดำเนินงาน (ดำเนินงานปกติ)" : `รายการ${selectedRawPlanCategory?.name ?? "งบประมาณ"}`}
                        </h3>
                        <span className="text-xs font-medium text-slate-500">{selectedRawPlanDetailRows.length.toLocaleString()} รายการ</span>
                      </div>
                      <div className="max-h-72 overflow-auto">
                        <table className="w-full min-w-[480px] divide-y divide-slate-200 text-xs">
                          <thead className="sticky top-0 bg-slate-100 text-left font-bold text-slate-700">
                            <tr>
                              <th className="w-[40%] px-2 py-2">รายการ</th>
                              <th className="w-[20%] px-2 py-2 text-right">รวม (10)</th>
                              <th className="w-[20%] px-2 py-2 text-right">คงเหลือ (11)</th>
                              <th className="w-[20%] px-2 py-2 text-right">ร้อยละ (12)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 bg-white">
                            {selectedRawPlanDetailRows.length ? selectedRawPlanDetailRows.map((item) => (
                              <tr key={item.id}>
                                <td className="w-[40%] max-w-0 px-2 py-2 font-semibold text-slate-900">
                                  <span className="line-clamp-2">{item.name}</span>
                                  <span className="mt-0.5 block text-[11px] font-normal text-slate-500">
                                    ผลผลิตที่ {item.output || "-"} · กิจกรรมหลักที่ {item.activity || "-"}
                                  </span>
                                </td>
                                <td className="w-[20%] px-2 py-2 text-right font-semibold text-slate-950">{formatBudgetAmount(item.utilizationTotal)}</td>
                                <td className="w-[20%] px-2 py-2 text-right font-semibold text-slate-950">{formatBudgetAmount(item.remaining)}</td>
                                <td className="w-[20%] px-2 py-2 text-right font-semibold text-teal-700">{formatBudgetAmount(item.disbursementRate)}%</td>
                              </tr>
                            )) : (
                              <tr>
                                <td colSpan={4} className="px-3 py-4 text-center text-slate-500">ไม่มีรายการในหมวดนี้</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                  </div>
                </div>

                {showBottomTable ? (
                  <div ref={projectTableRef} className="mt-5 overflow-hidden rounded-md border border-slate-200 bg-slate-50 shadow-sm scroll-mt-6">
                    <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
                      <h3 className="text-sm font-semibold text-slate-950">
                        รายการงบโครงการ (รวม)
                      </h3>
                      <span className="text-xs font-medium text-slate-500">{projectPlanDetailRows.length.toLocaleString()} รายการ</span>
                    </div>
                    <div className="max-h-[480px] overflow-auto">
                      <table className="w-full min-w-[760px] divide-y divide-slate-200 text-sm">
                        <thead className="sticky top-0 z-10 bg-slate-100 text-left text-xs font-semibold text-slate-700 shadow-sm">
                          <tr>
                            <th className="w-[55%] px-4 py-3">หัวข้อโครงการ</th>
                            <th className="w-[15%] px-4 py-3 text-right">รวม (10)</th>
                            <th className="w-[15%] px-4 py-3 text-right">คงเหลือ (11)</th>
                            <th className="w-[15%] px-4 py-3 text-right">ร้อยละ (12)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                          {projectPlanDetailRows.length ? renderProjectHierarchyRows(projectPlanDetailRows) : (
                            <tr>
                              <td colSpan={4} className="px-4 py-6 text-center text-slate-500">ไม่มีรายการในหมวดนี้</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : null}
              </div>


            </div>

            <section className="rounded-md border border-slate-200 bg-white p-3 shadow-sm xl:col-span-2">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <h2 className="text-base font-semibold text-slate-950">มาตรการเร่งรัดการเบิกจ่ายงบประมาณ และการใช้จ่ายภาครัฐ ตามไตรมาส</h2>
                  </div>
                  <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
                    เลือกไตรมาส
                    <select
                      value={selectedQuarter}
                      onChange={(event) => setSelectedQuarter(event.target.value as QuarterKey)}
                      className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-900 shadow-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
                    >
                      {quarterOptions.map((quarter) => (
                        <option key={quarter.key} value={quarter.key}>{quarter.label} ({quarter.period})</option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="mt-3 grid items-stretch gap-4 xl:grid-cols-[minmax(620px,740px)_minmax(780px,1fr)]">
                  <div className="grid h-full gap-2 sm:grid-cols-3">
                    {rawAssessmentRows.map((row) => {
                      const spendingDiff = row.actualSpending - row.target.spending;
                      const disbursementDiff = row.actualDisbursement - row.target.disbursement;

                      return (
                        <div key={row.group} className="h-full rounded-md border border-slate-200 bg-slate-50 p-3">
                          <p className="text-center text-base font-semibold text-slate-950">{row.label}</p>
                          <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                            <div className="rounded-md bg-white p-2">
                              <p className="text-slate-500">ใช้จ่ายจริง</p>
                              <p className="mt-0.5 text-xl font-bold text-slate-950">{formatBudgetAmount(row.actualSpending)}%</p>
                              <p className={spendingDiff >= 0 ? 'text-emerald-700' : 'text-amber-700'}>เป้า {formatBudgetAmount(row.target.spending)}%</p>
                            </div>
                            <div className="rounded-md bg-white p-2">
                              <p className="text-slate-500">เบิกจ่ายจริง</p>
                              <p className="mt-0.5 text-xl font-bold text-slate-950">{formatBudgetAmount(row.actualDisbursement)}%</p>
                              <p className={disbursementDiff >= 0 ? 'text-emerald-700' : 'text-amber-700'}>เป้า {formatBudgetAmount(row.target.disbursement)}%</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="overflow-x-auto rounded-md border border-slate-200">
                    <table className="w-full min-w-[780px] border-collapse text-center text-xs">
                      <thead className="text-slate-950">
                        <tr>
                          <th rowSpan={2} className="border border-slate-200 bg-white px-3 py-2 text-left align-middle">รายการ</th>
                          {quarterOptions.map((quarter) => (
                            <th key={quarter.key} colSpan={2} className={`border border-slate-200 px-3 py-2 ${quarterColors[quarter.key]}`}>{quarter.label}</th>
                          ))}
                          <th colSpan={2} className={`border border-slate-200 px-3 py-2 ${quarterColors.total}`}>รวม</th>
                        </tr>
                        <tr>
                          {[...quarterOptions.map((quarter) => quarter.key), 'total'].flatMap((key) => [
                            <th key={`${key}-spending`} className="border border-slate-200 bg-white px-3 py-2">ใช้จ่าย</th>,
                            <th key={`${key}-disbursement`} className="border border-slate-200 bg-white px-3 py-2">เบิกจ่าย</th>,
                          ])}
                        </tr>
                      </thead>
                      <tbody>
                        {assessmentGroupOrder.map((group) => (
                          <tr key={group} className="odd:bg-white even:bg-slate-50">
                            <td className="border border-slate-200 px-3 py-2 text-left font-semibold text-slate-900">{assessmentTargets[group].label}</td>
                            {([...quarterOptions.map((quarter) => quarter.key), 'total'] as Array<QuarterKey | 'total'>).flatMap((key) => [
                              <td key={`${group}-${key}-spending`} className="border border-slate-200 px-3 py-2 text-slate-700">{formatBudgetAmount(assessmentTargets[group][key].spending)}</td>,
                              <td key={`${group}-${key}-disbursement`} className="border border-slate-200 px-3 py-2 text-slate-700">{formatBudgetAmount(assessmentTargets[group][key].disbursement)}</td>,
                            ])}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>
          </section>
        </div>
      ) : null}

      {summary && totals && !rawWorkbook ? (
        <div className="space-y-6">
          <section className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
            <div className="space-y-4">
              <div className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-950">วงเงินตามแผนปฏิบัติราชการ</h2>
                <div className="relative mt-4 h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'งบบุคลากร', value: dbPersonnelPlanned },
                          { name: 'งบลงทุน', value: dbInvestmentPlanned },
                          { name: 'งบดำเนินงาน', value: dbOperationsPlanned },
                        ].filter((item) => item.value > 0)}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={72}
                        outerRadius={112}
                        paddingAngle={2}
                      >
                        {[
                          { key: 'personnel', color: '#2563eb' },
                          { key: 'investment', color: '#f59e0b' },
                          { key: 'operations_total', color: '#0f766e' },
                        ].filter(item => {
                          const val = item.key === 'personnel' ? dbPersonnelPlanned :
                                      item.key === 'investment' ? dbInvestmentPlanned :
                                      dbOperationsPlanned;
                          return val > 0;
                        }).map((item, index) => (
                          <Cell key={index} fill={item.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => formatExactBaht(Number(value))} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-center">
                    <div className="max-w-[130px]">
                      <p className="text-xs font-semibold text-slate-500">วงเงินตามแผนรวม</p>
                      <p className="text-[16px] font-bold leading-none text-slate-950 my-1">{formatBudgetAmount(dbPlannedTotal)}</p>
                      <p className="text-xs font-semibold text-slate-900">บาท</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  {[
                    { name: 'งบบุคลากร', value: dbPersonnelPlanned },
                    { name: 'งบลงทุน', value: dbInvestmentPlanned },
                    { name: 'งบดำเนินงาน', value: dbOperationsPlanned },
                  ].map((item) => (
                    <div key={item.name} className="flex items-center justify-between gap-3 text-sm">
                      <span className="min-w-0 truncate text-slate-600">{item.name}</span>
                      <span className="shrink-0 font-semibold text-slate-950">{formatBudgetAmount(item.value, 0)} บาท</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-950">งบประมาณที่ได้รับจัดสรร</h2>
                <div className="relative mt-4 h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={allocationData.length ? allocationData : [{ name: 'ไม่มีข้อมูลงวด', value: dashboardMetrics?.netAllocationTotal || totals.planned_budget_amount }]} dataKey="value" nameKey="name" innerRadius={72} outerRadius={112} paddingAngle={2}>
                        {(allocationData.length ? allocationData : [{ name: 'ไม่มีข้อมูลงวด', value: dashboardMetrics?.netAllocationTotal || totals.planned_budget_amount }]).map((_, index) => (
                          <Cell key={index} fill={chartColors[index % chartColors.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => formatExactBaht(Number(value))} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-center">
                    <div className="max-w-[130px]">
                      <p className="text-xs font-semibold text-slate-500">งบประมาณภาพรวม</p>
                      <p className="text-[15px] font-bold leading-none text-slate-950 my-1">{formatBudgetAmount(dashboardMetrics?.netAllocationTotal ?? 0)}</p>
                      <p className="text-xs font-semibold text-slate-500">บาท</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  {allocationData.map((item) => (
                    <div key={item.name} className="flex items-center justify-between gap-3 text-sm">
                      <span className="min-w-0 truncate text-slate-600">{item.name}</span>
                      <span className="shrink-0 font-semibold text-slate-950">{formatBudgetAmount(item.value, 0)} บาท</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-5">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <StatCard title="ยอดรวมสุทธิ" value={formatExactBaht(dashboardMetrics?.netAllocationTotal ?? 0)} subtext="งวดจัดสรร + รับโอน - โอนออก" icon={Coins} tone="bg-blue-50 text-blue-700 ring-blue-100" />
                <StatCard title="เบิกจ่ายรวม" value={formatExactBaht(totals.disbursed_total_amount)} subtext="รวมเบิกทั่วไปและเงินยืม" icon={WalletCards} tone="bg-emerald-50 text-emerald-700 ring-emerald-100" />
                <StatCard title="คงเหลือ" value={formatExactBaht(dashboardMetrics?.remaining ?? 0)} subtext="ยอดรวมสุทธิหลังใช้จ่ายรวม" icon={BarChart3} tone="bg-slate-50 text-slate-700 ring-slate-200" />
                <StatCard title="ร้อยละเบิกจ่าย" value={`${formatBudgetAmount(dashboardMetrics?.disbursementRate ?? 0)}%`} subtext="เบิกจ่ายรวมเทียบยอดรวมสุทธิ" icon={TrendingUp} tone="bg-amber-50 text-amber-700 ring-amber-100" />
              </div>


              <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <h2 className="text-base font-semibold text-slate-950">การประเมินตามไตรมาส</h2>
                    <p className="mt-1 text-xs text-slate-500">ปีงบประมาณไทย: ไตรมาส 1 เริ่ม ต.ค. และไตรมาส 4 สิ้นสุด ก.ย.</p>
                  </div>
                  <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
                    เลือกไตรมาส
                    <select
                      value={selectedQuarter}
                      onChange={(event) => setSelectedQuarter(event.target.value as QuarterKey)}
                      className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-900 shadow-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
                    >
                      {quarterOptions.map((quarter) => (
                        <option key={quarter.key} value={quarter.key}>{quarter.label} ({quarter.period})</option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  {assessmentRows.map((row) => {
                    const spendingDiff = row.actualSpending - row.target.spending;
                    const disbursementDiff = row.actualDisbursement - row.target.disbursement;

                    return (
                      <div key={row.group} className="rounded-md border border-slate-200 bg-slate-50 p-3">
                        <p className="text-sm font-semibold text-slate-950">{row.label}</p>
                        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                          <div className="rounded-md bg-white p-2">
                            <p className="text-slate-500">ใช้จ่ายจริง</p>
                            <p className="mt-1 text-lg font-bold text-slate-950">{formatBudgetAmount(row.actualSpending)}%</p>
                            <p className={spendingDiff >= 0 ? 'text-emerald-700' : 'text-amber-700'}>เป้า {formatBudgetAmount(row.target.spending)}%</p>
                          </div>
                          <div className="rounded-md bg-white p-2">
                            <p className="text-slate-500">เบิกจ่ายจริง</p>
                            <p className="mt-1 text-lg font-bold text-slate-950">{formatBudgetAmount(row.actualDisbursement)}%</p>
                            <p className={disbursementDiff >= 0 ? 'text-emerald-700' : 'text-amber-700'}>เป้า {formatBudgetAmount(row.target.disbursement)}%</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-4 overflow-x-auto rounded-md border border-slate-200">
                  <table className="min-w-[860px] border-collapse text-center text-xs">
                    <thead className="text-slate-950">
                      <tr>
                        <th rowSpan={2} className="border border-slate-200 bg-white px-3 py-2 text-left align-middle">รายการ</th>
                        {quarterOptions.map((quarter) => (
                          <th key={quarter.key} colSpan={2} className={`border border-slate-200 px-3 py-2 ${quarterColors[quarter.key]}`}>{quarter.label}</th>
                        ))}
                        <th colSpan={2} className={`border border-slate-200 px-3 py-2 ${quarterColors.total}`}>รวม</th>
                      </tr>
                      <tr>
                        {[...quarterOptions.map((quarter) => quarter.key), 'total'].flatMap((key) => [
                          <th key={`${key}-spending`} className="border border-slate-200 bg-white px-3 py-2">ใช้จ่าย</th>,
                          <th key={`${key}-disbursement`} className="border border-slate-200 bg-white px-3 py-2">เบิกจ่าย</th>,
                        ])}
                      </tr>
                    </thead>
                    <tbody>
                      {assessmentGroupOrder.map((group) => (
                        <tr key={group} className="odd:bg-white even:bg-slate-50">
                          <td className="border border-slate-200 px-3 py-2 text-left font-semibold text-slate-900">{assessmentTargets[group].label}</td>
                          {([...quarterOptions.map((quarter) => quarter.key), 'total'] as Array<QuarterKey | 'total'>).flatMap((key) => [
                            <td key={`${group}-${key}-spending`} className="border border-slate-200 px-3 py-2 text-slate-700">{formatBudgetAmount(assessmentTargets[group][key].spending)}</td>,
                            <td key={`${group}-${key}-disbursement`} className="border border-slate-200 px-3 py-2 text-slate-700">{formatBudgetAmount(assessmentTargets[group][key].disbursement)}</td>,
                          ])}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
                <h2 className="text-base font-semibold text-slate-950">สรุปผลตามหมวดงบประมาณ</h2>
                <div className="mt-4 h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={categoryData} margin={{ bottom: 44, left: 8, right: 8, top: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-15} textAnchor="end" height={58} />
                      <YAxis tickFormatter={(value) => `${Number(value) / 1_000_000}ล.`} />
                      <Tooltip formatter={(value) => formatExactBaht(Number(value))} />
                      <Bar dataKey="budget" name="งบประมาณ" fill="#2563eb" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="disbursed" name="เบิกจ่าย" fill="#f97316" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </section>

          <section className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-4 py-3">
              <h2 className="text-base font-semibold text-slate-950">ตารางสรุปงบประมาณ</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100 text-sm">
                <thead className="bg-slate-50 text-left text-xs font-semibold text-slate-500">
                  <tr>
                    <th className="px-4 py-3">รายการ</th>
                    <th className="px-4 py-3 text-right">ยอดรวมสุทธิ</th>
                    <th className="px-4 py-3 text-right">ส่วนกลาง รับโอน</th>
                    <th className="px-4 py-3 text-right">ส่วนกลาง โอนออก</th>
                    <th className="px-4 py-3 text-right">ภายในกรม ขอเพิ่ม</th>
                    <th className="px-4 py-3 text-right">ภายในกรม โอนออก</th>
                    <th className="px-4 py-3 text-right">ภายในกอง รับโอน</th>
                    <th className="px-4 py-3 text-right">ภายในกอง โอนออก</th>
                    <th className="px-4 py-3 text-right">เบิกจ่าย</th>
                    <th className="px-4 py-3 text-right">ร้อยละ</th>
                    <th className="px-4 py-3 text-right">คงเหลือ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {categoryData.map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-3 font-medium text-slate-900">{item.name}</td>
                      <td className="px-4 py-3 text-right text-slate-700">{formatBudgetAmount(item.budget, 0)}</td>
                      <td className="px-4 py-3 text-right text-slate-700">{formatBudgetAmount(item.amount.central_transfer_in_amount, 0)}</td>
                      <td className="px-4 py-3 text-right text-slate-700">{formatBudgetAmount(item.amount.central_transfer_out_amount, 0)}</td>
                      <td className="px-4 py-3 text-right text-slate-700">{formatBudgetAmount(item.amount.department_request_increase_amount, 0)}</td>
                      <td className="px-4 py-3 text-right text-slate-700">{formatBudgetAmount(item.amount.department_transfer_out_amount, 0)}</td>
                      <td className="px-4 py-3 text-right text-slate-700">{formatBudgetAmount(item.amount.division_transfer_in_amount, 0)}</td>
                      <td className="px-4 py-3 text-right text-slate-700">{formatBudgetAmount(item.amount.division_transfer_out_amount, 0)}</td>
                      <td className="px-4 py-3 text-right text-slate-700">{formatBudgetAmount(item.disbursed, 0)}</td>
                      <td className="px-4 py-3 text-right font-semibold text-teal-700">{formatBudgetAmount(item.rate)}%</td>
                      <td className="px-4 py-3 text-right text-slate-700">{formatBudgetAmount(item.remaining, 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
