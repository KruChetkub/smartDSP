import React, { type ReactNode } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { ProjectPlanDetailRow } from '../types/budgetDashboard.types';
import { formatBudgetAmount } from '../utils/budgetUtilizationCalculations';

interface ProjectHierarchyTableProps {
  projectPlanDetailRows: ProjectPlanDetailRow[];
  expandedProjectIds: string[];
  onToggleProjectExpansion: (projectId: string) => void;
  tableRef?: React.Ref<HTMLDivElement>;
}

export const ProjectHierarchyTable: React.FC<ProjectHierarchyTableProps> = ({
  projectPlanDetailRows,
  expandedProjectIds,
  onToggleProjectExpansion,
  tableRef,
}) => {
  const renderProjectHierarchyRows = (items: ProjectPlanDetailRow[], depth = 0): ReactNode[] => (
    items.flatMap((item) => {
      const isExpanded = expandedProjectIds.includes(item.id);
      const hasChildren = item.children.length > 0;
      let rowBackground = 'bg-white';
      if (depth > 0) {
        rowBackground = depth % 2 === 1 ? 'bg-sky-50/70' : 'bg-slate-50';
      }
      const row = (
        <tr key={item.id} className={rowBackground}>
          <td
            className="w-[55%] max-w-0 py-3 pr-4 font-medium text-slate-900"
            style={{ paddingLeft: `${16 + depth * 28}px` }}
          >
            <button
              type="button"
              onClick={() => onToggleProjectExpansion(item.id)}
              disabled={!hasChildren}
              aria-expanded={hasChildren ? isExpanded : undefined}
              className="flex w-full items-start gap-2 rounded-md text-left transition hover:bg-sky-100/70 focus:outline-none focus:ring-2 focus:ring-sky-200 disabled:cursor-default disabled:hover:bg-transparent"
            >
              <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center text-sky-700">
                {hasChildren ? (
                  isExpanded ? <ChevronDown className="h-4 w-4" aria-hidden="true" /> : <ChevronRight className="h-4 w-4" aria-hidden="true" />
                ) : null}
              </span>
              <span className="min-w-0">
                <span className={`line-clamp-2 text-slate-950 ${depth === 0 ? 'font-semibold' : 'font-medium'}`}>
                  {item.sequenceLabel ? `${item.sequenceLabel} ` : ''}
                  {item.name}
                </span>
                <span className="mt-1 block text-xs font-normal text-slate-500">
                  ผลผลิตที่ {item.output || '-'} · กิจกรรมหลักที่ {item.activity || '-'}
                  {hasChildren ? ` · ${item.children.length} รายการย่อย` : ''}
                </span>
              </span>
            </button>
          </td>
          <td
            className={`w-[15%] px-4 py-3 text-right text-slate-950 ${depth === 0 ? 'font-semibold' : 'font-medium'}`}
          >
            {formatBudgetAmount(item.utilizationTotal)}
          </td>
          <td
            className={`w-[15%] px-4 py-3 text-right text-slate-950 ${depth === 0 ? 'font-semibold' : 'font-medium'}`}
          >
            {formatBudgetAmount(item.remaining)}
          </td>
          <td
            className={`w-[15%] px-4 py-3 text-right text-teal-700 ${depth === 0 ? 'font-semibold' : 'font-medium'}`}
          >
            {formatBudgetAmount(item.disbursementRate)}%
          </td>
        </tr>
      );

      return isExpanded
        ? [row, ...renderProjectHierarchyRows(item.children, depth + 1)]
        : [row];
    })
  );

  return (
    <div ref={tableRef} className="mt-5 overflow-hidden rounded-md border border-slate-200 bg-slate-50 shadow-sm scroll-mt-6">
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
        <h3 className="text-sm font-semibold text-slate-950">รายการงบโครงการ (รวม)</h3>
        <span className="text-xs font-medium text-slate-500">
          {projectPlanDetailRows.length.toLocaleString()} รายการ
        </span>
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
            {projectPlanDetailRows.length ? (
              renderProjectHierarchyRows(projectPlanDetailRows)
            ) : (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-slate-500">
                  ไม่มีรายการในหมวดนี้
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
