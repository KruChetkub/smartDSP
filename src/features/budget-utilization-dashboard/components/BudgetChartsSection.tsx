import React from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { RawBudgetRow } from '../types/budgetDashboard.types';
import { chartColors } from '../types/budgetDashboard.types';
import { formatBudgetAmount } from '../utils/budgetUtilizationCalculations';
import { formatExactBaht } from '../utils/budgetDashboard.utils';

interface PlannedCategoryPieProps {
  rawPlanCategoryData: Array<RawBudgetRow & { key: string; color: string }>;
}

export const PlannedCategoryPie: React.FC<PlannedCategoryPieProps> = ({ rawPlanCategoryData }) => {
  const pieData = [
    { name: 'งบบุคลากร', value: rawPlanCategoryData.find((item) => item.key === 'personnel')?.planned ?? 0 },
    { name: 'งบลงทุน', value: rawPlanCategoryData.find((item) => item.key === 'investment')?.planned ?? 0 },
    { name: 'งบดำเนินงาน', value: rawPlanCategoryData.find((item) => item.key === 'operations_total')?.planned ?? 0 },
  ].filter((item) => item.value > 0);

  const totalPlanned =
    (rawPlanCategoryData.find((item) => item.key === 'personnel')?.planned ?? 0) +
    (rawPlanCategoryData.find((item) => item.key === 'investment')?.planned ?? 0) +
    (rawPlanCategoryData.find((item) => item.key === 'operations_total')?.planned ?? 0);

  return (
    <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-base font-semibold text-slate-950">วงเงินตามแผนปฏิบัติราชการ</h2>
      <div className="relative mt-3 h-56">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={pieData}
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
              ]
                .filter((item) => (rawPlanCategoryData.find((x) => x.key === item.key)?.planned ?? 0) > 0)
                .map((item) => (
                  <Cell key={item.key} fill={item.color} />
                ))}
            </Pie>
            <Tooltip formatter={(value) => formatExactBaht(Number(value))} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-center">
          <div className="max-w-[110px]">
            <p className="text-[10px] font-semibold text-slate-500">วงเงินตามแผนรวม</p>
            <p className="text-[16px] font-bold leading-none text-slate-950 my-0.5">
              {formatBudgetAmount(totalPlanned)}
            </p>
            <p className="text-[10px] font-semibold text-slate-500">บาท</p>
          </div>
        </div>
      </div>
      <div className="space-y-2">
        {[
          { name: 'งบบุคลากร', value: rawPlanCategoryData.find((item) => item.key === 'personnel')?.planned ?? 0 },
          { name: 'งบลงทุน', value: rawPlanCategoryData.find((item) => item.key === 'investment')?.planned ?? 0 },
          { name: 'งบดำเนินงาน', value: rawPlanCategoryData.find((item) => item.key === 'operations_total')?.planned ?? 0 },
        ].map((item) => (
          <div key={item.name} className="flex items-center justify-between gap-3 text-xs">
            <span className="min-w-0 truncate text-slate-900">{item.name}</span>
            <span className="shrink-0 font-semibold text-slate-950">
              {formatBudgetAmount(item.value, 0)} บาท
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

interface AllocationPieProps {
  displayedAllocationData: Array<{ name: string; value: number }>;
  totalNetAllocation: number;
  onOverviewClick: () => void;
}

export const AllocationPie: React.FC<AllocationPieProps> = ({
  displayedAllocationData,
  totalNetAllocation,
  onOverviewClick,
}) => {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-base font-semibold text-slate-950">งบประมาณที่รับจัดสรร</h2>
      <button
        type="button"
        className="relative mt-3 h-56 w-full cursor-pointer rounded-md text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2"
        title="กลับสู่ภาพรวมงบประมาณที่รับจัดสรร"
        aria-label="กลับสู่ภาพรวมงบประมาณที่รับจัดสรร"
        onClick={onOverviewClick}
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
              {displayedAllocationData.map((item, index) => (
                <Cell key={item.name} fill={chartColors[index % chartColors.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => formatExactBaht(Number(value))} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-center">
          <div className="max-w-[110px]">
            <p className="text-[10px] font-semibold text-slate-500">ยอดสุทธิภาพรวม</p>
            <p className="text-[16px] font-bold leading-none text-slate-950 my-0.5">
              {formatBudgetAmount(totalNetAllocation)}
            </p>
            <p className="text-[9px] font-semibold text-slate-500">บาท</p>
          </div>
        </div>
      </button>
      <div className="space-y-2">
        {displayedAllocationData.map((item) => (
          <div key={item.name} className="flex items-center justify-between gap-3 text-xs">
            <span className="min-w-0 truncate text-slate-900">{item.name}</span>
            <span className="shrink-0 font-semibold text-slate-950">
              {formatBudgetAmount(item.value, 0)} บาท
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export interface PlanChartItem extends RawBudgetRow {
  key: string;
  allocatedBudget: number;
  remainingFromAllocation: number;
  remainingFromAllocationRate: number;
  disbursementRateLabel: string;
  remainingFromAllocationLabel: string;
}

interface PlanCategoryBarChartProps {
  chartData: PlanChartItem[];
  selectedCategoryKey: string;
  showBottomTable: boolean;
  onCategoryClick: (key: string) => void;
}

export const PlanCategoryBarChart: React.FC<PlanCategoryBarChartProps> = ({
  chartData,
  selectedCategoryKey,
  showBottomTable,
  onCategoryClick,
}) => {
  return (
    <div className="h-96 xl:h-[500px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{ bottom: 16, left: 18, right: 12, top: 28 }}
          barGap={4}
        >
          <CartesianGrid stroke="#cbd5e1" strokeDasharray="3 4" vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 15, fontWeight: 400, fill: '#334155' }}
            interval={0}
            angle={-8}
            textAnchor="end"
            height={48}
          />
          <YAxis
            tick={{ fontSize: 14, fontWeight: 400, fill: '#64748b' }}
            tickFormatter={(value) => `${Number(value) / 1_000_000}ล.`}
          />
          <Tooltip formatter={(value) => formatExactBaht(Number(value))} />
          <Legend
            verticalAlign="bottom"
            iconType="square"
            wrapperStyle={{ color: '#334155', fontSize: 14, fontWeight: 400, paddingTop: 8 }}
          />
          <Bar
            dataKey="allocatedBudget"
            name="งบประมาณที่รับจัดสรร"
            fill="#1d4ed8"
            radius={[5, 5, 0, 0]}
            animationDuration={450}
          >
            {chartData.map((item) => {
              const isActive = showBottomTable
                ? item.key === 'project'
                : item.key === selectedCategoryKey;

              return (
                <Cell
                  key={item.key}
                  fill="#1d4ed8"
                  fillOpacity={isActive ? 1 : 0.58}
                  stroke={isActive ? '#172554' : '#1d4ed8'}
                  strokeWidth={isActive ? 2 : 1}
                  className="cursor-pointer"
                  onClick={() => onCategoryClick(item.key)}
                />
              );
            })}
          </Bar>
          <Bar
            dataKey="disbursedTotal"
            name="ผลเบิกจ่ายรวม"
            fill="#ea580c"
            radius={[5, 5, 0, 0]}
            animationDuration={450}
          >
            {chartData.map((item) => {
              const isActive = showBottomTable
                ? item.key === 'project'
                : item.key === selectedCategoryKey;

              return (
                <Cell
                  key={item.key}
                  fill="#ea580c"
                  fillOpacity={isActive ? 1 : 0.58}
                  stroke={isActive ? '#7c2d12' : '#ea580c'}
                  strokeWidth={isActive ? 2 : 1}
                  className="cursor-pointer"
                  onClick={() => onCategoryClick(item.key)}
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
          <Bar
            dataKey="remainingFromAllocation"
            name="คงเหลือ"
            fill="#0f766e"
            radius={[5, 5, 0, 0]}
            animationDuration={450}
          >
            {chartData.map((item) => {
              const isActive = showBottomTable
                ? item.key === 'project'
                : item.key === selectedCategoryKey;

              return (
                <Cell
                  key={item.key}
                  fill="#0f766e"
                  fillOpacity={isActive ? 1 : 0.58}
                  stroke={isActive ? '#134e4a' : '#0f766e'}
                  strokeWidth={isActive ? 2 : 1}
                  className="cursor-pointer"
                  onClick={() => onCategoryClick(item.key)}
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
  );
};

