import React from 'react';
import type { QuarterKey } from '../types/budgetDashboard.types';
import {
  assessmentGroupOrder,
  assessmentTargets,
  quarterColors,
  quarterOptions,
} from '../types/budgetDashboard.types';
import { formatBudgetAmount } from '../utils/budgetUtilizationCalculations';

export interface AssessmentRowItem {
  group: 'overall' | 'recurrent' | 'investment';
  label: string;
  target: { spending: number; disbursement: number };
  actualSpending: number;
  actualDisbursement: number;
}

interface QuarterAssessmentSectionProps {
  selectedQuarter: QuarterKey;
  onQuarterChange: (quarter: QuarterKey) => void;
  assessmentRows: AssessmentRowItem[];
}

export const QuarterAssessmentSection: React.FC<QuarterAssessmentSectionProps> = ({
  selectedQuarter,
  onQuarterChange,
  assessmentRows,
}) => {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-3 shadow-sm xl:col-span-2">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-950">
            มาตรการเร่งรัดการเบิกจ่ายงบประมาณ และการใช้จ่ายภาครัฐ ตามไตรมาส
          </h2>
        </div>
        <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
          เลือกไตรมาส
          <select
            value={selectedQuarter}
            onChange={(event) => onQuarterChange(event.target.value as QuarterKey)}
            className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-900 shadow-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
          >
            {quarterOptions.map((quarter) => (
              <option key={quarter.key} value={quarter.key}>
                {quarter.label} ({quarter.period})
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-3 grid items-stretch gap-4 xl:grid-cols-[minmax(620px,740px)_minmax(780px,1fr)]">
        <div className="grid h-full gap-2 sm:grid-cols-3">
          {assessmentRows.map((row) => {
            const spendingDiff = row.actualSpending - row.target.spending;
            const disbursementDiff = row.actualDisbursement - row.target.disbursement;

            return (
              <div key={row.group} className="h-full rounded-md border border-slate-200 bg-slate-50 p-3">
                <p className="text-center text-base font-semibold text-slate-950">{row.label}</p>
                <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-md bg-white p-2">
                    <p className="text-slate-500">ใช้จ่ายจริง</p>
                    <p className="mt-0.5 text-xl font-bold text-slate-950">
                      {formatBudgetAmount(row.actualSpending)}%
                    </p>
                    <p className={spendingDiff >= 0 ? 'text-emerald-700' : 'text-amber-700'}>
                      เป้า {formatBudgetAmount(row.target.spending)}%
                    </p>
                  </div>
                  <div className="rounded-md bg-white p-2">
                    <p className="text-slate-500">เบิกจ่ายจริง</p>
                    <p className="mt-0.5 text-xl font-bold text-slate-950">
                      {formatBudgetAmount(row.actualDisbursement)}%
                    </p>
                    <p className={disbursementDiff >= 0 ? 'text-emerald-700' : 'text-amber-700'}>
                      เป้า {formatBudgetAmount(row.target.disbursement)}%
                    </p>
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
                <th rowSpan={2} className="border border-slate-200 bg-white px-3 py-2 text-left align-middle">
                  รายการ
                </th>
                {quarterOptions.map((quarter) => (
                  <th
                    key={quarter.key}
                    colSpan={2}
                    className={`border border-slate-200 px-3 py-2 ${quarterColors[quarter.key]}`}
                  >
                    {quarter.label}
                  </th>
                ))}
                <th colSpan={2} className={`border border-slate-200 px-3 py-2 ${quarterColors.total}`}>
                  รวม
                </th>
              </tr>
              <tr>
                {[...quarterOptions.map((quarter) => quarter.key), 'total'].flatMap((key) => [
                  <th key={`${key}-spending`} className="border border-slate-200 bg-white px-3 py-2">
                    ใช้จ่าย
                  </th>,
                  <th key={`${key}-disbursement`} className="border border-slate-200 bg-white px-3 py-2">
                    เบิกจ่าย
                  </th>,
                ])}
              </tr>
            </thead>
            <tbody>
              {assessmentGroupOrder.map((group) => (
                <tr key={group} className="odd:bg-white even:bg-slate-50">
                  <td className="border border-slate-200 px-3 py-2 text-left font-semibold text-slate-900">
                    {assessmentTargets[group].label}
                  </td>
                  {([...quarterOptions.map((quarter) => quarter.key), 'total'] as Array<QuarterKey | 'total'>).flatMap(
                    (key) => [
                      <td key={`${group}-${key}-spending`} className="border border-slate-200 px-3 py-2 text-slate-700">
                        {formatBudgetAmount(assessmentTargets[group][key].spending)}
                      </td>,
                      <td key={`${group}-${key}-disbursement`} className="border border-slate-200 px-3 py-2 text-slate-700">
                        {formatBudgetAmount(assessmentTargets[group][key].disbursement)}
                      </td>,
                    ],
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
};

