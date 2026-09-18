import React from 'react';
import { Bell, Search, Menu } from 'lucide-react';
import { useStore } from '../../store/useStore';

export default function Header() {
  const { selectedYear, selectedQuarter, setSelectedYear, setSelectedQuarter } = useStore();

  const currentYear = new Date().getFullYear() + 543;
  const years = [currentYear, currentYear - 1, currentYear - 2];
  const quarters = ['Q1', 'Q2', 'Q3', 'Q4', 'YEAR'];

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 z-10 sticky top-0">
      <div className="flex items-center gap-4">
        <button className="md:hidden text-slate-500 hover:text-slate-700">
          <Menu size={20} />
        </button>
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input 
            type="text" 
            placeholder="Search KPIs..." 
            className="pl-9 pr-4 py-1.5 text-sm bg-slate-100 border-none rounded-md focus:ring-2 focus:ring-blue-500 w-64 outline-none"
          />
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <select 
            className="text-sm border-slate-300 rounded-md shadow-sm focus:border-blue-500 outline-none py-1.5 px-3 bg-slate-50"
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
          >
            {years.map(y => (
              <option key={y} value={y}>ปีงบประมาณ {y}</option>
            ))}
          </select>

          <select 
            className="text-sm border-slate-300 rounded-md shadow-sm focus:border-blue-500 outline-none py-1.5 px-3 bg-slate-50"
            value={selectedQuarter}
            onChange={(e) => setSelectedQuarter(e.target.value)}
          >
            {quarters.map(q => (
              <option key={q} value={q}>{q === 'YEAR' ? 'ภาพรวมทั้งปี' : `ไตรมาส ${q}`}</option>
            ))}
          </select>
        </div>

        <button className="relative text-slate-500 hover:text-slate-700 transition-colors">
          <Bell size={20} />
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            3
          </span>
        </button>
      </div>
    </header>
  );
}
