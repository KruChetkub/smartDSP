import { useMemo, useState } from 'react';
import type {
  BudgetUtilizationDashboardSummary,
  BudgetUtilizationItemWithAmount,
} from '../types/budgetUtilization.types';
import type {
  FormulaAuditRow,
  HierarchyAuditIssue,
} from '../types/budgetItems.types';
import {
  buildHierarchyRollupMap,
  formatBudgetAmount,
  normalizeAmount,
  percent,
  summarizeBudgetItems,
  toNumber,
} from '../utils/budgetUtilizationCalculations';
import { getBudgetItemSearchLabel } from '../utils/budgetItems.utils';

export function useBudgetHierarchyState(
  summary: BudgetUtilizationDashboardSummary | null,
  selectedParentId: string | null = null,
) {
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [selectedMajorProjectId, setSelectedMajorProjectId] = useState('');
  const [selectedSubActivityId, setSelectedSubActivityId] = useState('');
  const [allocationItemSearch, setAllocationItemSearch] = useState('');
  const [transactionItemSearch, setTransactionItemSearch] = useState('');
  const [formulaAuditItemId, setFormulaAuditItemId] = useState('');

  const allBudgetItems = useMemo(() => summary?.items ?? [], [summary]);

  const hierarchyItems = useMemo(() => {
    const compareItems = (a: BudgetUtilizationItemWithAmount, b: BudgetUtilizationItemWithAmount) => {
      const sequenceCompare = (a.sequence_label ?? '').localeCompare(
        b.sequence_label ?? '',
        'th',
        { numeric: true },
      );
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
    return (
      formulaAuditItems.find((item) => item.id === formulaAuditItemId) ??
      formulaAuditItems[0] ??
      null
    );
  }, [formulaAuditItemId, formulaAuditItems]);

  const formulaAuditRows = useMemo<FormulaAuditRow[]>(() => {
    if (!formulaAuditItem) return [];

    const amount = rollupMap.get(formulaAuditItem.id) ?? normalizeAmount(formulaAuditItem.amount);
    const allocationTotal =
      toNumber(amount.allocation_total_amount) ||
      amount.allocation_tranche_1_amount +
        amount.allocation_tranche_2_amount +
        amount.allocation_tranche_3_amount;
    const expectedNet =
      allocationTotal +
      amount.central_transfer_in_amount -
      amount.central_transfer_out_amount +
      amount.department_request_increase_amount -
      amount.department_transfer_out_amount +
      amount.division_transfer_in_amount -
      amount.division_transfer_out_amount;
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
        title: 'ยอดสุทธิหลังโอนเปลี่ยนแปลง (1)',
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
    allBudgetItems
      .filter((item) => item.row_type !== 'total')
      .forEach((item) => {
        const parent = item.parent_id ? itemById.get(item.parent_id) : null;
        const addIssue = (message: string) =>
          issues.push({
            itemId: item.id,
            sequenceLabel: item.sequence_label ?? '-',
            itemName: item.item_name,
            message,
          });

        if (item.parent_id && !parent) {
          addIssue('ไม่พบรายการแม่ที่เชื่อมโยง');
        } else if (
          item.row_type === 'major_project' &&
          parent &&
          parent.row_type !== 'budget_category'
        ) {
          addIssue('โครงการใหญ่ต้องอยู่ภายใต้ประเภทหลัก');
        } else if (
          item.row_type === 'sub_project' &&
          parent &&
          parent.row_type !== 'major_project'
        ) {
          addIssue('โครงการย่อยต้องอยู่ภายใต้โครงการใหญ่');
        } else if (item.row_type === 'activity' && parent && parent.row_type !== 'sub_project') {
          addIssue('กิจกรรมต้องอยู่ภายใต้โครงการย่อย');
        }

        const children = childrenByParent.get(item.id) ?? [];
        if (children.length === 0) return;
        const parentPlan = toNumber(item.amount.planned_budget_amount);
        const childPlan = children.reduce(
          (sum, child) => sum + toNumber(child.amount.planned_budget_amount),
          0,
        );
        if (parentPlan > 0 && childPlan - parentPlan > 0.01) {
          addIssue(
            `วงเงินรายการลูก ${formatBudgetAmount(childPlan)} บาท เกินวงเงินรายการแม่ ${formatBudgetAmount(parentPlan)} บาท`,
          );
        }
      });

    return issues;
  }, [allBudgetItems]);

  const mainBudgetItems = useMemo(() => {
    return allBudgetItems.filter(
      (item) => item.parent_id === null && item.row_type === 'budget_category',
    );
  }, [allBudgetItems]);

  const selectedParent = useMemo(() => {
    return allBudgetItems.find((item) => item.id === selectedParentId) ?? null;
  }, [allBudgetItems, selectedParentId]);

  const majorProjectItems = useMemo(() => {
    return allBudgetItems.filter((item) => item.row_type === 'major_project');
  }, [allBudgetItems]);

  const selectedMainCategory = useMemo(() => {
    let currentItem = selectedParent;
    while (currentItem && currentItem.row_type !== 'budget_category') {
      currentItem = currentItem.parent_id
        ? (allBudgetItems.find((item) => item.id === currentItem?.parent_id) ?? null)
        : null;
    }
    return currentItem ?? mainBudgetItems.find((item) => item.id === selectedCategoryId) ?? null;
  }, [allBudgetItems, mainBudgetItems, selectedCategoryId, selectedParent]);

  const selectedCategoryMajorProjects = useMemo(() => {
    if (!selectedMainCategory) return [];
    return majorProjectItems
      .filter((project) => project.parent_id === selectedMainCategory.id)
      .sort((a, b) => {
        const sequenceCompare = (a.sequence_label ?? '').localeCompare(
          b.sequence_label ?? '',
          'th',
          { numeric: true },
        );
        return sequenceCompare || a.sort_order - b.sort_order;
      });
  }, [majorProjectItems, selectedMainCategory]);

  const selectedMajorProject = useMemo(() => {
    return (
      selectedCategoryMajorProjects.find((project) => project.id === selectedMajorProjectId) ?? null
    );
  }, [selectedCategoryMajorProjects, selectedMajorProjectId]);

  const selectedMajorProjectSubActivities = useMemo(() => {
    if (!selectedMajorProject) return [];
    return allBudgetItems
      .filter((item) => item.parent_id === selectedMajorProject.id && item.row_type === 'sub_project')
      .sort((a, b) => {
        const sequenceCompare = (a.sequence_label ?? '').localeCompare(
          b.sequence_label ?? '',
          'th',
          { numeric: true },
        );
        return sequenceCompare || a.sort_order - b.sort_order;
      });
  }, [allBudgetItems, selectedMajorProject]);

  const selectedSubActivity = useMemo(() => {
    return (
      selectedMajorProjectSubActivities.find((item) => item.id === selectedSubActivityId) ?? null
    );
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

  const isOperationsCategorySelected =
    selectedMainCategory?.item_name.replace(/\s+/g, '').includes('งบดำเนินงาน') ?? false;

  const availableBudgetParents = useMemo(() => {
    return mainBudgetItems.flatMap((category) => [
      category,
      ...majorProjectItems
        .filter((project) => project.parent_id === category.id)
        .flatMap((project) => [
          project,
          ...allBudgetItems.filter(
            (item) => item.parent_id === project.id && item.row_type === 'sub_project',
          ),
        ]),
    ]);
  }, [allBudgetItems, mainBudgetItems, majorProjectItems]);

  const budgetLineItems = useMemo(() => {
    return hierarchyItems.filter((item) => {
      if (item.parent_id === null) return false;
      const isStructuralMajorProject =
        item.row_type === 'major_project' &&
        allBudgetItems.some((candidate) => candidate.parent_id === item.id);
      const isStructuralSubActivity =
        item.row_type === 'sub_project' &&
        allBudgetItems.some((candidate) => candidate.parent_id === item.id);
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
        const score =
          normalizedQuery.length === 0
            ? 4
            : normalizedSequence.startsWith(normalizedQuery)
              ? 0
              : normalizedName.startsWith(normalizedQuery)
                ? 1
                : normalizedLabel.includes(normalizedQuery)
                  ? 2
                  : 3;
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
        const score =
          normalizedQuery.length === 0
            ? 4
            : normalizedSequence.startsWith(normalizedQuery)
              ? 0
              : normalizedName.startsWith(normalizedQuery)
                ? 1
                : normalizedLabel.includes(normalizedQuery)
                  ? 2
                  : 3;
        return { item, label, matches, score };
      })
      .filter((entry) => entry.matches)
      .sort((a, b) => a.score - b.score || a.label.localeCompare(b.label, 'th', { numeric: true }));
  }, [allocationItemSearch, budgetLineItems]);

  const getMainSequenceLabel = (itemId: string | null) => {
    const existingIndex = itemId ? mainBudgetItems.findIndex((item) => item.id === itemId) : -1;
    return String(existingIndex >= 0 ? existingIndex + 1 : mainBudgetItems.length + 1);
  };

  const getChildSequenceLabel = (
    parent: BudgetUtilizationItemWithAmount,
    itemId: string | null,
  ) => {
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
      (summary?.items ?? [])
        .filter((item) => item.parent_id === parentId)
        .forEach((item) => {
          descendants.push(item);
          appendChildren(item.id);
        });
    };
    appendChildren(itemId);
    return descendants;
  };

  return {
    allBudgetItems,
    hierarchyItems,
    rollupMap,
    tableTotals,
    formulaAuditItems,
    formulaAuditItemId,
    setFormulaAuditItemId,
    formulaAuditItem,
    formulaAuditRows,
    hierarchyAuditIssues,
    mainBudgetItems,
    selectedCategoryId,
    setSelectedCategoryId,
    selectedMajorProjectId,
    setSelectedMajorProjectId,
    selectedSubActivityId,
    setSelectedSubActivityId,
    selectedMainCategory,
    selectedCategoryMajorProjects,
    selectedMajorProject,
    selectedMajorProjectSubActivities,
    selectedSubActivity,
    selectedSubActivityBudgetItems,
    isOperationsCategorySelected,
    availableBudgetParents,
    budgetLineItems,
    transactionItemSearch,
    setTransactionItemSearch,
    transactionItemSearchResults,
    allocationItemSearch,
    setAllocationItemSearch,
    allocationItemSearchResults,
    getMainSequenceLabel,
    getChildSequenceLabel,
    getCategoryChildCount,
    getDirectChildCount,
    getDescendantItems,
  };
}

