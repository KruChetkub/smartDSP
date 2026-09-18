import React from 'react';
import { AlertCircle, FileText } from 'lucide-react';

export default function KpiDataPolicyNotice({ compact = false, className = '' }) {
  return (
    <div
      className={`rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 shadow-sm ${className}`}
    >
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center shrink-0">
          <FileText size={14} className="text-slate-600" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-black text-slate-800 flex items-center gap-2">
            <AlertCircle size={14} className="text-sky-500 shrink-0" />
            มาตรฐานการกรอกข้อมูล KPI
          </p>
          <p className={`text-slate-600 ${compact ? 'text-[11px]' : 'text-sm'} leading-relaxed mt-1`}>
            เว้นว่าง = <span className="font-black text-slate-800">null</span> ·
            0 = <span className="font-black text-slate-800">ค่าจริง</span> ·
            ถ้ายังไม่มีผล สามารถเว้นว่างได้ และระบบจะนับเป็นรายการรอข้อมูล
          </p>
        </div>
      </div>
    </div>
  );
}
