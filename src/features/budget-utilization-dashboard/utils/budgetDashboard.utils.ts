import type {
  BudgetUtilizationAmount,
  BudgetUtilizationDashboardSummary,
  BudgetUtilizationItemWithAmount,
  BudgetUtilizationRawWorkbook,
} from '../types/budgetUtilization.types';
import {
  buildHierarchyRollupMap,
  formatBudgetAmount,
  getNetAllocationTotal,
  normalizeAmount,
  percent,
  sumBudgetAmounts,
  summarizeBudgetItems,
  toNumber,
} from './budgetUtilizationCalculations';
import type {
  AssessmentGroupKey,
  ProjectPlanDetailRow,
  RawBudgetRow,
} from '../types/budgetDashboard.types';
import { plannedBudgetCategoryDefinitions } from '../types/budgetDashboard.types';

export function formatExactBaht(value: number): string {
  return `${formatBudgetAmount(value, Number.isInteger(value) ? 0 : 2)} บาท`;
}

export function isProjectBudgetCategory(name: string): boolean {
  return /งบโครงการ/.test(name);
}

const PROJECT_ROOT_REGEX = /^3\.[56](?:\s|$)/;

export function getProjectRootSequence(values: unknown[]): string {
  for (const value of values) {
    if (value === null || value === undefined) continue;
    const match = PROJECT_ROOT_REGEX.exec(String(value).trim());
    if (match) return match[0];
  }
  return '';
}

export function getDashboardAmountMetrics(amount: BudgetUtilizationAmount) {
  const netAllocationTotal = getNetAllocationTotal(amount);
  const remaining = Math.max(0, netAllocationTotal - amount.utilization_total_amount);

  return {
    netAllocationTotal,
    disbursementRate: percent(amount.disbursed_total_amount, netAllocationTotal),
    utilizationRate: percent(amount.utilization_total_amount, netAllocationTotal),
    remaining,
  };
}

export function formatThaiDataUpdate(value: string | null | undefined): string {
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

export const hierarchyAmountFields = [
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

export function getCategoryAmount(category: BudgetUtilizationItemWithAmount, items: BudgetUtilizationItemWithAmount[]) {
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
  const aggregatedAmount = Object.fromEntries(
    hierarchyAmountFields.map((field) => {
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
    }),
  ) as Partial<BudgetUtilizationAmount>;

  return normalizeAmount(aggregatedAmount);
}

export function isInvestmentCategory(name: string): boolean {
  return /ลงทุน/.test(name);
}

export function getActualByGroup(
  group: AssessmentGroupKey,
  totals: BudgetUtilizationAmount,
  categoryData: Array<{ name: string; amount: BudgetUtilizationAmount }>,
) {
  if (group === 'overall') {
    return getDashboardAmountMetrics(totals);
  }

  const categoryAmounts = categoryData
    .filter((item) => (group === 'investment' ? isInvestmentCategory(item.name) : !isInvestmentCategory(item.name)))
    .map((item) => item.amount);

  return getDashboardAmountMetrics(sumBudgetAmounts(categoryAmounts));
}

export function getRawCell(row: string[], index: number): string {
  return String(row[index] ?? '').trim();
}

export function rawWorkbookHasDepartmentTransfers(rawWorkbook: BudgetUtilizationRawWorkbook): boolean {
  return rawWorkbook.rows.slice(0, 4).some((row) =>
    row.some((cell) => String(cell ?? '').replace(/\s+/g, '').includes('ภายในกรม')),
  );
}

export function mapRawBudgetRow(row: string[], index: number, hasDepartmentColumns = false): RawBudgetRow {
  const transferOffset = hasDepartmentColumns ? 2 : 0;
  const summaryLabel = getRawCell(row, 0);

  let name = summaryLabel;
  if (!/\(รวม\)/.test(summaryLabel) && summaryLabel !== 'งบดำเนินงาน') {
    name = getRawCell(row, 5) || getRawCell(row, 1) || summaryLabel || `แถวที่ ${index + 1}`;
  }

  const netTotal = toNumber(row[12]);
  const committedTotal = toNumber(row[19 + transferOffset]) || toNumber(row[17 + transferOffset]) + toNumber(row[18 + transferOffset]);
  const disbursedTotal = toNumber(row[22 + transferOffset]) || toNumber(row[20 + transferOffset]) + toNumber(row[21 + transferOffset]);
  const utilizationTotal = toNumber(row[23 + transferOffset]) || committedTotal + disbursedTotal;
  const remaining = toNumber(row[24 + transferOffset]) || netTotal - utilizationTotal;

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

export function getRawDashboardRows(rawWorkbook: BudgetUtilizationRawWorkbook | null | undefined) {
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
      return (/\(รวม\)/.test(cell0) || cell0 === 'งบดำเนินงาน') && !/รวมทั้งสิ้น/.test(cell0);
    })
    .map(({ mapped }) => mapped);

  return { total, categories };
}

export function sumRawBudgetRows(rows: RawBudgetRow[]): RawBudgetRow {
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

export function getRawPlanCategoryData(categories: RawBudgetRow[]) {
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

export function getRawPlanDetailRows(rawWorkbook: BudgetUtilizationRawWorkbook | null | undefined, categoryKey: string) {
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

export function getRawActualByGroup(group: AssessmentGroupKey, total: RawBudgetRow | null, categories: RawBudgetRow[]) {
  if (!total) return null;
  if (group === 'overall') {
    return total;
  }

  const groupCategories = categories.filter((item) => (group === 'investment' ? isInvestmentCategory(item.name) : !isInvestmentCategory(item.name)));
  return sumRawBudgetRows(groupCategories);
}

export function buildDatabaseWorkbook(summary: BudgetUtilizationDashboardSummary | null): BudgetUtilizationRawWorkbook | null {
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
    const isProject = isProjectItem(item);
    let categoryName = category?.item_name ?? '';
    if (/งบดำเนินงาน/.test(categoryName)) {
      categoryName = isProject ? 'งบโครงการ' : 'งบดำเนินงาน';
    }

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

