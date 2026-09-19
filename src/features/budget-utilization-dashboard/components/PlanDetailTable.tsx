import React from 'react';
import type { RawBudgetRow } from '../types/budgetDashboard.types';
import { formatBudgetAmount } from '../utils/budgetUtilizationCalculations';

interface PlanDetailTableProps {
  selectedCategoryName: string;
  detailRows: Array<
    RawBudgetRow & {
      output?: string;
      activity?: string;
    }
  >;
}

export const PlanDetailTable: React.FC<PlanDetailTableProps> = ({
  selectedCategoryName,
  detailRows,
}) => {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-3 py-2">
        <h3 className="text-sm font-bold text-slate-950">
          รายการ{selectedCategoryName}
        </h3>
        <span className="text-xs font-medium text-slate-500">
          {detailRows.length.toLocaleString()} รายการ
        </span>
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
            {detailRows.length ? (
              detailRows.map((item) => (
                <tr key={item.id}>
                  <td className="w-[40%] max-w-0 px-2 py-2 font-semibold text-slate-900">
                    <span className="line-clamp-2">{item.name}</span>
                    <span className="mt-0.5 block text-[11px] font-normal text-slate-500">
                      ผลผลิตที่ {item.output || '-'} · กิจกรรมหลักที่ {item.activity || '-'}
                    </span>
                  </td>
                  <td className="w-[20%] px-2 py-2 text-right font-semibold text-slate-950">
                    {formatBudgetAmount(item.utilizationTotal)}
                  </td>
                  <td className="w-[20%] px-2 py-2 text-right font-semibold text-slate-950">
                    {formatBudgetAmount(item.remaining)}
                  </td>
                  <td className="w-[20%] px-2 py-2 text-right font-semibold text-teal-700">
                    {formatBudgetAmount(item.disbursementRate)}%
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="px-3 py-4 text-center text-slate-500">
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

