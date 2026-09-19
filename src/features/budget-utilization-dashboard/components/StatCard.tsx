import React from 'react';
import type { Coins } from 'lucide-react';
import type { TargetTone } from '../types/budgetDashboard.types';
import { formatBudgetAmount } from '../utils/budgetUtilizationCalculations';

interface StatCardProps {
  title: string;
  value: string;
  subtext?: string;
  icon: typeof Coins;
  tone: string;
}

export const StatCard: React.FC<StatCardProps> = ({ title, value, subtext = '', icon: Icon, tone }) => {
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
};

interface TargetCardProps {
  title: string;
  value: number;
  target: number;
  tone?: TargetTone;
}

export const TargetCard: React.FC<TargetCardProps> = ({ title, value, target, tone = 'blue' }) => {
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
};

